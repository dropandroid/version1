
import { NextResponse } from 'next/server';
import { saveFcmToken } from '@/lib/dynamodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerId, token } = body;

    if (!token || !customerId) {
      console.error('[save-token-api] Error: Missing token or customerId in body:', body);
      return NextResponse.json({ message: 'Missing token or customerId' }, { status: 400 });
    }

    console.log(`[save-token-api] Received request to save token for customer ${customerId}`);
    const success = await saveFcmToken(customerId, token);

    if (success) {
      console.log(`[save-token-api] Successfully processed request for ${customerId}`);
      return NextResponse.json({ message: 'Token saved successfully' });
    } else {
      console.error(`[save-token-api] saveFcmToken function returned false for ${customerId}`);
      return NextResponse.json({ message: 'Failed to save token in database' }, { status: 500 });
    }
  } catch (error) {
    console.error('[save-token-api] Internal Server Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
