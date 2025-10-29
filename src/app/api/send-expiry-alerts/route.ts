
import 'dotenv/config';
import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import * as admin from 'firebase-admin';
import type { CustomerData } from '@/lib/types';

// Initialize Firebase Admin SDK lazily
function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
            if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
                throw new Error("Firebase Admin SDK credentials are not fully set in environment variables.");
            }
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log('[CRON] Firebase Admin SDK initialized successfully.');
        } catch (e) {
            console.error('[CRON] Firebase admin initialization error', e);
            throw e;
        }
    }
    return admin.app();
}


const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "droppurity-customers";
const EXPIRY_THRESHOLD_DAYS = 5;

// This function can be called by both the scheduled job and the manual trigger
export async function runExpiryCheck() {
  console.log(`[ExpiryCheck] Starting expiry alert check with threshold of ${EXPIRY_THRESHOLD_DAYS} days...`);
  
  initializeFirebaseAdmin();

  const scanCommand = new ScanCommand({ 
      TableName: TABLE_NAME,
      FilterExpression: "attribute_exists(planEndDate) AND attribute_exists(fcmToken)"
  });
  const { Items } = await docClient.send(scanCommand);

  if (!Items || Items.length === 0) {
    console.log('[ExpiryCheck] No customers with plan end dates and FCM tokens found.');
    return { 
        message: 'No customers to check.',
        processedCount: 0,
        sent: 0,
        failed: 0,
        details: []
    };
  }
  console.log(`[ExpiryCheck] Found ${Items.length} customers with tokens to check for expiry.`);

  const customers = Items as CustomerData[];
  const notificationPromises: Promise<any>[] = [];
  const processedDetails: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  customers.forEach(customer => {
    let notificationMessage;
    let status = 'skipped';

    if (customer.planEndDate && customer.fcmToken && customer.generatedCustomerId) {
      const endDate = new Date(customer.planEndDate);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`[ExpiryCheck] Checking customer ${customer.generatedCustomerId}: Plan ends on ${customer.planEndDate}. Days remaining: ${diffDays}`);

      if (diffDays <= 0) { // Plan has expired
        notificationMessage = {
          notification: {
            title: 'AquaTrack Plan Expired',
            body: 'Your plan has expired. Please recharge immediately to restore service.',
          },
          token: customer.fcmToken,
        };
        status = 'expired';
      } else if (diffDays <= EXPIRY_THRESHOLD_DAYS) { // Plan is expiring soon
        notificationMessage = {
          notification: {
            title: 'AquaTrack Plan Expiry',
            body: `Your plan is expiring in ${diffDays} day(s). Renew now to continue service.`,
          },
          token: customer.fcmToken,
        };
        status = 'expiring';
      }
      
      if (notificationMessage) {
        console.log(`[ExpiryCheck] SUCCESS: Found ${status} plan for ${customer.generatedCustomerId}. Queuing notification.`);
        notificationPromises.push(admin.messaging().send(notificationMessage));
        processedDetails.push({ customerId: customer.generatedCustomerId, status, diffDays });
      } else {
         processedDetails.push({ customerId: customer.generatedCustomerId, status: 'not_due', diffDays });
      }
    }
  });

  if (notificationPromises.length === 0) {
      console.log('[ExpiryCheck] No plans found meeting the expiry criteria.');
      return { 
          message: 'Expiry alert check ran, but no notifications were required to be sent.',
          processedCount: customers.length,
          sent: 0,
          failed: 0,
          details: processedDetails
      };
  }

  const results = await Promise.allSettled(notificationPromises);
  let successCount = 0;
  
  results.forEach((result, index) => {
    const detail = processedDetails.find(d => d.customerId === processedDetails[index].customerId);
    if (result.status === 'fulfilled') {
      successCount++;
      if (detail) detail.notificationStatus = 'fulfilled';
    } else {
      if (detail) detail.notificationStatus = 'rejected';
      console.error(`[ExpiryCheck] Failed to send notification to ${detail?.customerId}:`, result.reason);
    }
  });

  const failedCount = results.length - successCount;
  console.log(`[ExpiryCheck] Complete. Sent: ${successCount}, Failed: ${failedCount}`);

  return {
    message: 'Expiry alert check complete.',
    processedCount: customers.length,
    sent: successCount,
    failed: failedCount,
    details: processedDetails,
  };
}

// This is the endpoint that Netlify's cron job will call
export async function GET() {
  try {
    const result = await runExpiryCheck();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CRON] Error sending expiry alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
