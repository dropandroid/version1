import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { CustomerData } from '@/lib/types';

const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const verifyCustomerPin = async (customerId: string, pin: string, googleEmail: string): Promise<CustomerData | null> => {
  try {
    const command = new GetCommand({
      TableName: "droppurity-customers",
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
    
    if (pin === expectedPin) {
      const updateCommand = new UpdateCommand({
        TableName: "droppurity-customers",
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
    } else {
      console.log("Incorrect PIN");
      return null;
    }
  } catch (error) {
    console.error("Error verifying customer in DynamoDB:", error);
    return null;
  }
};
