
import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import * as admin from 'firebase-admin';
import type { CustomerData } from '@/lib/types';

// Initialize Firebase Admin SDK
// Ensure you have your service account key file in your project
// and the GOOGLE_APPLICATION_CREDENTIALS environment variable set.
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
        });
    } catch (e) {
        console.error('Firebase admin initialization error', e);
    }
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
const EXPIRY_THRESHOLD_DAYS = 3;

export async function GET() {
  try {
    const scanCommand = new ScanCommand({ TableName: TABLE_NAME });
    const { Items } = await docClient.send(scanCommand);

    if (!Items) {
      return NextResponse.json({ message: 'No customers found.' });
    }

    const customers = Items as CustomerData[];
    const notificationPromises: Promise<any>[] = [];
    const today = new Date();
    
    customers.forEach(customer => {
      if (customer.planEndDate && customer.fcmToken) {
        const endDate = new Date(customer.planEndDate);
        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0 && diffDays <= EXPIRY_THRESHOLD_DAYS) {
          const message = {
            notification: {
              title: 'AquaTrack Plan Expiry',
              body: `Your plan is expiring in ${diffDays} day(s). Renew now to continue service.`,
            },
            token: customer.fcmToken,
          };
          
          console.log(`Sending notification to ${customer.generatedCustomerId}`);
          notificationPromises.push(admin.messaging().send(message));
        }
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    return NextResponse.json({ 
        message: 'Expiry alert check complete.',
        sent: successCount,
        failed: failedCount,
    });

  } catch (error) {
    console.error('Error sending expiry alerts:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
