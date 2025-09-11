import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
  region: process.env.DROPPURITY_AWS_REGION,
  credentials: {
    accessKeyId: process.env.DROPPURITY_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.DROPPURITY_AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

export const verifyCustomerPin = async (customerId: string, pin: string, googleEmail: string): Promise<boolean> => {
  try {
    const command = new GetCommand({
      TableName: "customers", // Assuming your table is named 'customers'
      Key: {
        customerId: customerId,
      },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
      console.log("Customer not found");
      return false; // Customer ID does not exist
    }

    // Assuming PIN is stored as the last 4 digits of a 'mobile' attribute
    const storedMobile = Item.mobile as string;
    if (!storedMobile || storedMobile.length < 4) {
        console.log("Mobile number not found or too short for customer");
        return false;
    }
    const expectedPin = storedMobile.slice(-4);
    
    if (pin === expectedPin) {
      // PIN is correct, now link the Google email
      const updateCommand = new UpdateCommand({
        TableName: "customers",
        Key: {
          customerId: customerId,
        },
        UpdateExpression: "set google_email = :email",
        ExpressionAttributeValues: {
          ":email": googleEmail,
        },
      });
      await docClient.send(updateCommand);
      console.log("Customer verified and email linked.");
      return true;
    } else {
      console.log("Incorrect PIN");
      return false; // PIN is incorrect
    }
  } catch (error) {
    console.error("Error verifying customer in DynamoDB:", error);
    return false;
  }
};
