
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  GetCommand,
  ScanCommand
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
  // A Scan is less efficient than a Query, but it works without needing a pre-configured index.
  // This is a robust way to find the user by email if indexes are not guaranteed to exist.
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'emailId = :email or google_email = :email',
    ExpressionAttributeValues: { ':email': email },
  });

  try {
    const { Items } = await docClient.send(command);
    if (Items && Items.length > 0) {
      return Items[0] as CustomerData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching customer by email with Scan:", error);
    throw new Error("Could not search for customer by email.");
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
