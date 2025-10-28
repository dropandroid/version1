
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";
import type { CustomerData } from "./types";

const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = "droppurity-customers";

export const getCustomerByEmail = async (email: string): Promise<CustomerData | null> => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'emailId-index', // Assuming you have a GSI on emailId
    KeyConditionExpression: 'emailId = :email',
    ExpressionAttributeValues: { ':email': email },
  });

  try {
    const { Items } = await docClient.send(command);
    if (Items && Items.length > 0) {
      // Also check google_email as a fallback
      return Items[0] as CustomerData;
    }
    
    // Fallback query on google_email if you have an index for it
    const googleEmailCommand = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'google_email-index', // Assuming you have a GSI on google_email
        KeyConditionExpression: 'google_email = :email',
        ExpressionAttributeValues: { ':email': email },
    });

    const { Items: GoogleItems } = await docClient.send(googleEmailCommand);
    if(GoogleItems && GoogleItems.length > 0) {
        return GoogleItems[0] as CustomerData;
    }
    
    return null;

  } catch (error) {
    console.error("Error fetching customer by email:", error);
    // If one index fails, it doesn't mean the other will.
    // Consider how to handle partial failures if necessary.
    try {
        const googleEmailCommand = new QueryCommand({
            TableName: TABLE_NAME,
            IndexName: 'google_email-index', // Assuming you have a GSI on google_email
            KeyConditionExpression: 'google_email = :email',
            ExpressionAttributeValues: { ':email': email },
        });
        const { Items } = await docClient.send(googleEmailCommand);
        return Items && Items.length > 0 ? (Items[0] as CustomerData) : null;
    } catch (fallbackError) {
         console.error("Error fetching customer by google_email (fallback):", fallbackError);
         return null;
    }
  }
};

export const verifyCustomerPin = async (customerId: string, pin: string, userEmail: string): Promise<CustomerData | null> => {
    const getCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: { generatedCustomerId: customerId },
    });
    
    try {
        const { Item } = await docClient.send(getCommand);

        if (Item && Item.customerPhone && (Item.customerPhone.slice(-4) === pin)) {
            // PIN is correct, now associate the google_email
            const updateCommand = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { generatedCustomerId: customerId },
                UpdateExpression: "set google_email = :email, planStatus = :status",
                ExpressionAttributeValues: {
                    ":email": userEmail,
                    ":status": "active"
                },
                ReturnValues: "ALL_NEW",
            });
            const { Attributes } = await docClient.send(updateCommand);
            return Attributes as CustomerData;
        }
        return null; // PIN is incorrect or customer not found
    } catch (error) {
        console.error("Error verifying customer PIN:", error);
        throw new Error("Could not verify customer identity.");
    }
};

export const saveFcmToken = async (customerId: string, token: string): Promise<boolean> => {
    console.log(`Attempting to save token for customerId: ${customerId}`);
    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
            generatedCustomerId: customerId,
        },
        UpdateExpression: 'SET fcmToken = :token',
        ExpressionAttributeValues: {
            ':token': token,
        },
    });

    try {
        await docClient.send(command);
        console.log(`Successfully updated fcmToken for ${customerId}`);
        return true;
    } catch (error) {
        console.error(`DynamoDB Error saving fcmToken for ${customerId}:`, error);
        return false;
    }
};
