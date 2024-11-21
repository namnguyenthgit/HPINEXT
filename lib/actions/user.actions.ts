'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, PlaidError, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { stringify } from "querystring";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { PlaidLinkTokenResponse } from "@/types/plaid";
import { AxiosError } from "axios";

interface SignInError {
  code?: number;
  type?: string;
  message?: string;
}

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const signIn = async ({ email, password }: signInProps) => {
    try {
        //Mutation/ Database / Make fetch
        const { account } = await createAdminClient();
        const session = await account.createEmailPasswordSession(email, password);
        //console.log('useraction-signin response:',response);
        // Use cookies() with await
        const cookieStore = await cookies();
        cookieStore.set("appwrite-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });
        return parseStringify(session);
    } catch (error: unknown) {
      const typedError = error as SignInError; // Cast to known type
      console.error('Error:', typedError);

      const errorMessage =
        typedError?.message || typedError?.type || 'An unexpected error occurred.';

      return {
        code: typedError?.code || 500,
        type: typedError?.type || 'unknown_error',
        message: errorMessage,
      };
    }
}

export const signUp = async ({password, ...userData} : SignUpParams) => {
  const { email, firstName, lastName } = userData;
  let newUserAccount;
  try {
      // Create a user account
      
      const { account, database } = await createAdminClient();

      newUserAccount = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);
      if(!newUserAccount) throw new Error('Error creating user')

      // create dwolla customer
      const dwollaCustomerUrl = await createDwollaCustomer({
        ...userData,
        type: "personal",
      });
      if (!dwollaCustomerUrl) throw new Error("Error creating dwolla customer");

      const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);
      const newUser = await database.createDocument(
        DATABASE_ID!,
        USER_COLLECTION_ID!,
        ID.unique(),
        {
          ...userData,
          userId: newUserAccount.$id,
          dwollaCustomerId,
          dwollaCustomerUrl,          
        }
      );

      const session = await account.createEmailPasswordSession(email, password);
      
      const cookieStore = await cookies();
      cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
      });

      //return parseStringify(newUserAccount);
      return parseStringify(newUser);

  } catch (error) {
      console.error('Error', error);
  }
}

export async function getLoggedInUser() {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const session = cookieStore.get('appwrite-session');

    // If no session exists, return null or throw error
    if (!session || !session.value) {
      console.log("No session available");
      return null; // Handle this case (e.g., return null or redirect to login page)
    }

    const { account } = await createSessionClient();
    // Check if the session is authorized for the required actions
    try {
      const user = await account.get(); // Make sure the session has the correct scope
      return parseStringify(user);
    } catch (accountError) {
      console.error("Error fetching user:", accountError);
      return null; // Handle session scope or authentication error here
    }
  } catch (error) {
    console.error('Error fetching logged in user:', error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    (await cookies()).delete('appwrite-session');
    await account.deleteSession('current');
  } catch (error) {
    console.error('Error during logout:', error);
    return null;
  }
}

export const createLinkToken = async (user: User) => {
  try {
    console.log('Creating link token for user:', user);
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);
    console.log('Plaid Response:', response.data); // Debugging
    return { linkToken: response.data.link_token }; // Return as an object 
  } catch (error) {
    console.error('Error creating link token:', error);
    return null; // Ensure the function does not throw
  }
}

export const createBankAccount = async ({
  userId,
  bankId,
  accountId,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountId,
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    );

    return parseStringify(bankAccount);
  } catch (error) {
    console.error("Error", error);
    return null;
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    // Exchange public token for access token and item ID
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Get account information from Plaid using the access token
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accountData = accountsResponse.data.accounts[0];

    // Create a processor token for Dwolla using the access token and account ID
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(request);
    const processorToken = processorTokenResponse.data.processor_token;

    // Create a funding source URL for the account using the Dwolla customer ID, processor token, and bank name
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // If the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

     // Create a bank account using the user ID, item ID, account ID, access token, funding source URL, and shareableId ID
     await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });

    // Revalidate the path to reflect the changes
    revalidatePath("/");

    // Return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });

  } catch (error) {
    console.error("An error occur while creating exchange token:", error);
  }
}