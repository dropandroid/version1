
import { NextResponse } from 'next/server';
import { saveFcmToken } from '@/lib/dynamodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, customerId } = body;

    if (!token || !customerId) {
      console.error('API Error in save-token: Missing token or customerId');
      return NextResponse.json({ message: 'Missing token or customerId' }, { status: 400 });
    }

    console.log(`[save-token] Received FCM token for customer ${customerId}: ${token.substring(0, 15)}...`);
    const success = await saveFcmToken(customerId, token);

    if (success) {
      console.log(`[save-token] Successfully saved token for ${customerId}`);
      return NextResponse.json({ message: 'Token saved successfully' });
    } else {
      console.error(`[save-token] Failed to save token for ${customerId}`);
      return NextResponse.json({ message: 'Failed to save token' }, { status: 500 });
    }
  } catch (error) {
    console.error('[save-token] API Error saving token:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
