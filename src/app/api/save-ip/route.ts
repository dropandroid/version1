
import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { UpdateCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getCustomerById } from '@/lib/dynamodb';

const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "droppurity-customers";

export async function POST(request: Request) {
  console.log("[API/save-ip] Request received.");
  try {
    const body = await request.json();
    const { customerId, ipAddress, deviceId } = body;

    if (!customerId || !ipAddress || !deviceId) {
      console.error("[API/save-ip] Missing customerId, ipAddress, or deviceId in body:", body);
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    
    // First, verify the customer exists.
    const customer = await getCustomerById(customerId);
    if (!customer) {
        console.error(`[API/save-ip] Customer not found for ID: ${customerId}`);
        return NextResponse.json({ message: `Customer not found` }, { status: 404 });
    }

    console.log(`[API/save-ip] Updating IP for customer ${customerId} to ${ipAddress}`);

    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        generatedCustomerId: customerId,
      },
      UpdateExpression: 'SET lastKnownIp = :ip, serialNumber = :serial',
      ExpressionAttributeValues: {
        ':ip': ipAddress,
        ':serial': deviceId, // Also update the serial number to ensure it's linked
      },
       ReturnValues: "UPDATED_NEW",
    });

    const { Attributes } = await docClient.send(command);
    console.log(`[API/save-ip] Successfully updated IP for ${customerId}.`, Attributes);
    return NextResponse.json({ message: 'IP address saved successfully', attributes: Attributes });

  } catch (error) {
    console.error("[API/save-ip] Internal Server Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
