
import { NextResponse } from 'next/server';
import { runExpiryCheck } from '@/app/api/send-expiry-alerts/route';

// A dedicated endpoint for manually triggering the expiry check logic.
export async function GET() {
  console.log('[MANUAL TRIGGER] Manual notification check initiated.');
  try {
    // We reuse the exact same logic from the scheduled function, specifying the trigger type
    const result = await runExpiryCheck('manual');
    console.log('[MANUAL TRIGGER] Manual check finished successfully.');
    // Return the detailed results as a JSON response
    return NextResponse.json(result);
  } catch (error) {
    console.error('[MANUAL TRIGGER] An error occurred during the manual check:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Manual Trigger Failed', error: errorMessage }, { status: 500 });
  }
}
