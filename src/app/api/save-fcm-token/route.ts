
import { NextResponse } from 'next/server';
import { saveFcmToken } from '@/lib/dynamodb';

/**
 * API route to save a Firebase Cloud Messaging (FCM) token
 * to a customer's record in DynamoDB.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, fcmToken } = body;

    if (!customerId || !fcmToken) {
      console.error('API Error: Missing customerId or fcmToken in request body');
      return NextResponse.json(
        { message: 'Missing customerId or fcmToken' },
        { status: 400 }
      );
    }
    
    console.log(`Received API call to save token for customer ${customerId}`);
    const success = await saveFcmToken(customerId, fcmToken);

    if (success) {
      console.log(`Successfully processed save-token request for ${customerId}`);
      return NextResponse.json({ message: 'Token saved successfully' });
    } else {
      console.error(`Failed to save token for ${customerId} via API call.`);
      return NextResponse.json(
        { message: 'Failed to save token in database.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('API Error in /api/save-fcm-token:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
