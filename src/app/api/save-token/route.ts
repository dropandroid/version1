
import { NextResponse } from 'next/server';
import { saveFcmToken } from '@/lib/dynamodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, customerId } = body;

    if (!token || !customerId) {
      console.error('API Error: Missing token or customerId');
      return NextResponse.json({ message: 'Missing token or customerId' }, { status: 400 });
    }

    console.log(`Received FCM token for customer ${customerId}: ${token}`);
    const success = await saveFcmToken(customerId, token);

    if (success) {
      console.log(`Successfully saved token for ${customerId}`);
      return NextResponse.json({ message: 'Token saved successfully' });
    } else {
      console.error(`Failed to save token for ${customerId}`);
      return NextResponse.json({ message: 'Failed to save token' }, { status: 500 });
    }
  } catch (error) {
    console.error('API Error saving token:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
