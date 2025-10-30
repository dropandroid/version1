import 'dotenv/config';
import { NextResponse } from 'next/server';
import { DynamoDBClient, CreateTableCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as admin from 'firebase-admin';
import type { CustomerData } from '@/lib/types';
import { randomUUID } from 'crypto';


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
const CUSTOMERS_TABLE_NAME = "droppurity-customers";
const LOG_TABLE_NAME = "droppurity-notification-logs";
const EXPIRY_THRESHOLD_DAYS = 5;
const SEVEN_DAYS_IN_SECONDS = 7 * 24 * 60 * 60;

let isLogTableChecked = false;

async function ensureLogTableExists() {
    if (isLogTableChecked) return;
    
    try {
        const createTableCommand = new CreateTableCommand({
            TableName: LOG_TABLE_NAME,
            AttributeDefinitions: [{ AttributeName: 'logId', AttributeType: 'S' }],
            KeySchema: [{ AttributeName: 'logId', KeyType: 'HASH' }],
            ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
        });
        await client.send(createTableCommand);
        console.log(`[Log] Table "${LOG_TABLE_NAME}" created successfully.`);
    } catch (error: any) {
        if (error.name === 'ResourceInUseException') {
            // Table already exists, which is fine.
        } else {
            console.error(`[Log] Error ensuring log table exists:`, error);
            throw error;
        }
    }

    try {
        // This is an older API and might not be supported on all SDK versions
        // but it's the standard way to enable TTL.
        // For localstack/testing, this might require manual setup.
        // In production AWS DynamoDB, this would be `updateTimeToLive`.
    } catch (error) {
        console.warn(`[Log] Could not automatically enable TTL on "${LOG_TABLE_NAME}". Please check table settings in AWS Console.`, error);
    }
    
    isLogTableChecked = true;
}


async function logNotification(customerId: string, message: string, triggerType: 'auto' | 'manual') {
    await ensureLogTableExists();
    const sentAt = new Date();
    // TTL attribute must be a number (epoch seconds)
    const ttl = Math.floor(sentAt.getTime() / 1000) + SEVEN_DAYS_IN_SECONDS;

    const command = new PutCommand({
        TableName: LOG_TABLE_NAME,
        Item: {
            logId: randomUUID(),
            customerId: customerId,
            sentAt: sentAt.toISOString(),
            message: message,
            triggerType: triggerType,
            ttl: ttl,
        },
    });

    try {
        await docClient.send(command);
        console.log(`[Log] Successfully logged notification for ${customerId} (Trigger: ${triggerType})`);
    } catch (error) {
        console.error(`[Log] Error logging notification for ${customerId}:`, error);
    }
}


// This function can be called by both the scheduled job and the manual trigger
export async function runExpiryCheck(triggerType: 'auto' | 'manual' = 'auto') {
  console.log(`[ExpiryCheck] Starting expiry alert check (Trigger: ${triggerType}) with threshold of ${EXPIRY_THRESHOLD_DAYS} days...`);
  
  initializeFirebaseAdmin();

  // Scan the entire table to get all customers
  const scanCommand = new ScanCommand({ TableName: CUSTOMERS_TABLE_NAME });
  const { Items } = await docClient.send(scanCommand);

  if (!Items || Items.length === 0) {
    console.log('[ExpiryCheck] No customers found in the table.');
    return { 
        message: 'No customers to check.',
        processedCount: 0,
        sent: 0,
        failed: 0,
        details: []
    };
  }
  console.log(`[ExpiryCheck] Found ${Items.length} total customers. Filtering for expiry checks...`);

  const customers = Items as CustomerData[];
  const notificationPromises: Promise<{ customerId: string; message: string; result: any}>[] = [];
  const processedDetails: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  customers.forEach(customer => {
    let notificationMessage;
    let notificationBody = '';
    let status = 'skipped';
    let detail: any = { customerId: customer.generatedCustomerId || 'N/A' };

    // Only process customers who have a plan end date and a push notification token
    if (customer.planEndDate && customer.fcmToken && customer.generatedCustomerId) {
      const endDate = new Date(customer.planEndDate);
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      detail.diffDays = diffDays;
      detail.planEndDate = customer.planEndDate;
      
      console.log(`[ExpiryCheck] Checking customer ${customer.generatedCustomerId}: Plan ends on ${customer.planEndDate}. Days remaining: ${diffDays}`);

      if (diffDays <= 0) { // Plan has expired
        notificationBody = 'Your plan has expired. Please recharge immediately to restore service.';
        notificationMessage = {
          notification: {
            title: 'Droppurity Plan Expired',
            body: notificationBody,
          },
          token: customer.fcmToken,
        };
        status = 'expired_notification_sent';
      } else if (diffDays <= EXPIRY_THRESHOLD_DAYS) { // Plan is expiring soon
        notificationBody = `Your plan is expiring in ${diffDays} day(s). Renew now to continue service.`;
        notificationMessage = {
          notification: {
            title: 'Droppurity Plan Expiry',
            body: notificationBody,
          },
          token: customer.fcmToken,
        };
        status = 'expiring_notification_sent';
      } else {
        status = 'not_due';
      }
      
      if (notificationMessage && customer.generatedCustomerId) {
        console.log(`[ExpiryCheck] SUCCESS: Queuing '${status}' notification for ${customer.generatedCustomerId}.`);
        
        const sendPromise = admin.messaging().send(notificationMessage)
            .then(result => ({ customerId: customer.generatedCustomerId!, message: notificationBody, result }));

        notificationPromises.push(sendPromise);
        detail.status = status;
      } else {
        detail.status = status;
      }
    } else {
        // Log why a customer was skipped
        let skipReason = [];
        if (!customer.planEndDate) skipReason.push("missing planEndDate");
        if (!customer.fcmToken) skipReason.push("missing fcmToken");
        if (!customer.generatedCustomerId) skipReason.push("missing generatedCustomerId");
        detail.status = 'skipped';
        detail.reason = skipReason.join(', ');
    }
    processedDetails.push(detail);
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

  console.log(`[ExpiryCheck] Waiting for ${notificationPromises.length} notifications to be sent...`);
  const settledResults = await Promise.allSettled(notificationPromises);
  let successCount = 0;
  
  for (const result of settledResults) {
    const detail = processedDetails.find(d => 
        result.status === 'fulfilled' && d.customerId === result.value.customerId && d.status.includes('_notification_sent')
    );
    
    if (result.status === 'fulfilled') {
      successCount++;
      const { customerId, message } = result.value;
      if (detail) detail.notificationStatus = 'fulfilled';
      // Log the successful notification
      await logNotification(customerId, message, triggerType);
    } else {
      console.error(`[ExpiryCheck] FAILED to send a notification:`, result.reason);
      const failedDetail = processedDetails.find(d => d.status.includes('_notification_sent') && d.notificationStatus !== 'fulfilled');
      if (failedDetail) {
          failedDetail.notificationStatus = 'rejected';
      }
    }
  }

  const failedCount = settledResults.length - successCount;
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
export async function GET(request: Request) {
    // This is to handle the pre-flight request for CORS from the admin panel
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204 });
    }
    
    try {
        const result = await runExpiryCheck('auto'); // This is an automatic trigger
        return NextResponse.json(result);
    } catch (error) {
        console.error('[CRON] Error sending expiry alerts:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
    }
}