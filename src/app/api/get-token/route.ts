
import { NextResponse } from 'next/server';
import { getCustomerById } from '@/lib/dynamodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ message: 'Missing customerId query parameter' }, { status: 400 });
    }

    console.log(`Fetching token for customerId: ${customerId}`);
    const customer = await getCustomerById(customerId);

    if (customer) {
      if (customer.fcmToken) {
        console.log(`Token found for ${customerId}`);
        return NextResponse.json({ customerId: customer.generatedCustomerId, fcmToken: customer.fcmToken });
      } else {
        console.log(`No token found for ${customerId}`);
        return NextResponse.json({ message: `No FCM token found for customer ${customerId}` }, { status: 404 });
      }
    } else {
      console.log(`Customer not found: ${customerId}`);
      return NextResponse.json({ message: `Customer not found: ${customerId}` }, { status: 404 });
    }
  } catch (error) {
    console.error('API Error fetching token:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
