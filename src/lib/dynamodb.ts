import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import type { CustomerData } from '@/lib/types';

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
  try {
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "emailId = :email",
      ExpressionAttributeValues: {
        ":email": email,
      },
    });

    const { Items } = await docClient.send(command);

    if (Items && Items.length > 0) {
      console.log(`Found customer for email ${email}`);
      return Items[0] as CustomerData;
    } else {
      console.log(`No customer found for email ${email}`);
      return null;
    }
  } catch (error) {
    console.error("Error scanning for customer by email:", error);
    // This could fail if the table doesn't have a GSI on email, but we proceed.
    return null;
  }
}


export const verifyCustomerPin = async (customerId: string, pin: string, googleEmail: string): Promise<CustomerData | null> => {
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        generatedCustomerId: customerId,
      },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
      console.log("Customer not found");
      return null;
    }

    const storedMobile = Item.customerPhone as string;
    if (!storedMobile || storedMobile.length < 4) {
        console.log("Mobile number not found or too short for customer");
        return null;
    }
    const expectedPin = storedMobile.slice(-4);
    
    // Also allow verification if the user has already linked their email.
    const isAlreadyLinked = Item.google_email === googleEmail;

    if (pin === expectedPin || isAlreadyLinked) {
      if (!isAlreadyLinked) {
          const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
              generatedCustomerId: customerId,
            },
            UpdateExpression: "set google_email = :email",
            ExpressionAttributeValues: {
              ":email": googleEmail,
            },
            ReturnValues: "ALL_NEW",
          });
          const { Attributes } = await docClient.send(updateCommand);
          console.log("Customer verified and email linked.");
          return Attributes as CustomerData;
      }
      console.log("Customer already verified and linked.");
      return Item as CustomerData;
    } else {
      console.log("Incorrect PIN");
      return null;
    }
  } catch (error) {
    console.error("Error verifying customer in DynamoDB:", error);
    // This will catch ResourceNotFoundException if the table is wrong.
    if ((error as Error).name === 'ResourceNotFoundException') {
        throw new Error(`The specified table '${TABLE_NAME}' was not found in your AWS region. Please check the table name and region configuration.`);
    }
    return null;
  }
};
