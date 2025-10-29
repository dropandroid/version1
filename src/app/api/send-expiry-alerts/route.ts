
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
            // The private key needs to have its newlines properly escaped when stored in an env var.
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
            console.log('Firebase Admin SDK initialized successfully.');
        } catch (e) {
            console.error('Firebase admin initialization error', e);
            // We throw the error to make it clear that initialization failed.
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
const EXPIRY_THRESHOLD_DAYS = 3; // Notify for plans expiring within this many days.

export async function GET() {
  console.log('[CRON] Starting expiry alert check...');
  try {
    // Ensure Firebase is initialized before proceeding
    initializeFirebaseAdmin();

    const scanCommand = new ScanCommand({ 
        TableName: TABLE_NAME,
        // Only scan for items that have a plan end date and an FCM token.
        FilterExpression: "attribute_exists(planEndDate) AND attribute_exists(fcmToken)"
    });
    const { Items } = await docClient.send(scanCommand);

    if (!Items || Items.length === 0) {
      console.log('[CRON] No customers with plan end dates and FCM tokens found.');
      return NextResponse.json({ message: 'No customers to check.' });
    }
    console.log(`[CRON] Found ${Items.length} customers with tokens to check for expiry.`);

    const customers = Items as CustomerData[];
    const notificationPromises: Promise<any>[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date to the beginning of the day for accurate comparison

    customers.forEach(customer => {
      // Ensure we have the necessary data to proceed
      if (customer.planEndDate && customer.fcmToken && customer.generatedCustomerId) {
        const endDate = new Date(customer.planEndDate);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Check if the plan is expiring within the threshold (and hasn't already expired)
        if (diffDays > 0 && diffDays <= EXPIRY_THRESHOLD_DAYS) {
          const message = {
            notification: {
              title: 'AquaTrack Plan Expiry',
              body: `Your plan is expiring in ${diffDays} day(s). Renew now to continue service.`,
            },
            token: customer.fcmToken,
          };
          
          console.log(`[CRON] Found expiring plan for ${customer.generatedCustomerId}. Queuing notification.`);
          notificationPromises.push(admin.messaging().send(message));
        }
      }
    });

    if (notificationPromises.length === 0) {
        console.log('[CRON] No plans found expiring within the threshold.');
        return NextResponse.json({ 
            message: 'Expiry alert check ran, but no notifications were required to be sent.',
        });
    }

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;
    
    console.log(`[CRON] Expiry alert check complete. Sent: ${successCount}, Failed: ${failedCount}`);

    results.forEach(result => {
        if (result.status === 'rejected') {
            console.error('[CRON] Failed to send notification:', result.reason);
        }
    });

    return NextResponse.json({ 
        message: 'Expiry alert check complete.',
        sent: successCount,
        failed: failedCount,
    });

  } catch (error) {
    console.error('[CRON] Error sending expiry alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
