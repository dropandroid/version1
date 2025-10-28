
import { NextResponse } from 'next/server';
import { getCustomerById } from '@/lib/dynamodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ message: 'Missing customerId query parameter' }, { status: 400 });
    }

    console.log(`[DEBUG API] Fetching data for customerId: ${customerId}`);
    const customer = await getCustomerById(customerId);

    if (customer) {
      console.log(`[DEBUG API] Data found for ${customerId}`);
      // Return the raw customer data as JSON
      return NextResponse.json(customer);
    } else {
      console.log(`[DEBUG API] Customer not found: ${customerId}`);
      return NextResponse.json({ message: `Customer not found: ${customerId}` }, { status: 404 });
    }
  } catch (error) {
    console.error('[DEBUG API] Error fetching customer data:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
