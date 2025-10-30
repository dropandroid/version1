
import { NextResponse } from 'next/server';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "droppurity-notification-logs";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  console.log('[API/get-notification-logs] Request received.');
  
  const command = new ScanCommand({
    TableName: TABLE_NAME,
  });

  try {
    const { Items } = await docClient.send(command);
    
    // Sort items by date, newest first
    const sortedItems = Items?.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    console.log(`[API/get-notification-logs] Found ${sortedItems?.length || 0} logs.`);
    return NextResponse.json(sortedItems || [], { headers: CORS_HEADERS });
  } catch (error) {
    console.error('[API/get-notification-logs] Error fetching notification logs:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
