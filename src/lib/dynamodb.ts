
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
  console.log(`[DB] Searching for customer with email: ${email}`);
  const command = new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'emailId = :email or google_email = :email',
    ExpressionAttributeValues: { ':email': email },
  });

  try {
    const { Items } = await docClient.send(command);
    if (Items && Items.length > 0) {
      console.log(`[DB] Found customer for email ${email}`);
      return Items[0] as CustomerData;
    }
    console.log(`[DB] No customer found for email ${email}`);
    return null;
  } catch (error) {
    console.error("[DB Error] Error fetching customer by email with Scan:", error);
    throw new Error("Could not search for customer by email.");
  }
};

export const getCustomerById = async (customerId: string): Promise<CustomerData | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: { generatedCustomerId: customerId },
  });

  try {
    const { Item } = await docClient.send(command);
    if (Item) {
        console.log(`[DB] Found customer for ID ${customerId}`);
    } else {
        console.log(`[DB] No customer found for ID ${customerId}`);
    }
    return (Item as CustomerData) || null;
  } catch (error) {
    console.error(`[DB Error] Error fetching customer by ID ${customerId}:`, error);
    throw new Error("Could not fetch customer by ID.");
  }
};


export const verifyCustomerPin = async (customerId: string, pin: string, userEmail: string, fcmToken?: string | null): Promise<CustomerData | null> => {
    const getCommand = new GetCommand({
        TableName: TABLE_NAME,
        Key: { generatedCustomerId: customerId },
    });
    
    try {
        const { Item } = await docClient.send(getCommand);

        if (Item && Item.customerPhone && (Item.customerPhone.slice(-4) === pin)) {
            console.log(`[DB] PIN verified for ${customerId}. Associating email ${userEmail}.`);
            
            let updateExpression = "set google_email = :email, planStatus = :status";
            const expressionAttributeValues: { [key: string]: any } = {
                ":email": userEmail,
                ":status": "active"
            };

            if (fcmToken) {
                console.log(`[DB] FCM token provided. Adding to update for ${customerId}.`);
                updateExpression += ", fcmToken = :token";
                expressionAttributeValues[":token"] = fcmToken;
            }

            const updateCommand = new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { generatedCustomerId: customerId },
                UpdateExpression: updateExpression,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: "ALL_NEW",
            });
            const { Attributes } = await docClient.send(updateCommand);
            return Attributes as CustomerData;
        }
        console.log(`[DB] PIN verification failed for ${customerId}.`);
        return null;
    } catch (error) {
        console.error("[DB Error] Error verifying customer PIN:", error);
        throw new Error("Could not verify customer identity.");
    }
};

export const saveFcmToken = async (customerId: string, token: string): Promise<boolean> => {
    console.log(`✅ [Step 4: The Database] Attempting to save token for customerId: ${customerId}`);
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
        console.log(`[DB] Successfully updated fcmToken for ${customerId}`);
        return true;
    } catch (error) {
        console.error(`❌ [DB Error] DynamoDB Error saving fcmToken for ${customerId}:`, error);
        return false;
    }
};
