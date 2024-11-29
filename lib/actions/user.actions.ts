'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { error } from "console";
import { appwriteConfig } from "../appwrite-config";

interface SignInError {
  code?: number;
  type?: string;
  message?: string;
}

const DATABASE_ID = appwriteConfig.databaseId
const USER_COLLECTION_ID = appwriteConfig.userCollectionId
const BANK_COLLECTION_ID = appwriteConfig.bankCollectionId
const PRIVATE_BANK_COLLECTION_ID = appwriteConfig.privateBankCollectionId

// Get all users  
export const getAllUsers = async () => {  
  try {  
    const { database } = await createAdminClient();  
    const users = await database.listDocuments(  
      DATABASE_ID!,  
      USER_COLLECTION_ID!  
    );  
    if (!users) throw error;  
    return parseStringify(users.documents);  
  } catch (error) {  
    console.error("An error occurred while getting all users:", error);  
    return [];  
  }  
}  

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();
    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId',[userId])]
    )
    if (!user) throw error;
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("An error occur while getBanks:", error);
    return null;
  }
}

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
        const user = await getUserInfo({ userId: session.userId})
        return parseStringify(user);
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
      const result = await account.get(); // Make sure the session has the correct scope
      const user = await getUserInfo({ userId: result.$id})
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
    //console.log('Creating link token for user:', user);
    const tokenParams = {
      user: {
        client_user_id: user.$id
      },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ['auth','transactions'] as Products[],
      language: 'en',
      country_codes: ['US'] as CountryCode[],
    }

    const response = await plaidClient.linkTokenCreate(tokenParams);
    //console.log('Plaid Response:', response.data); // Debugging
    return { linkToken: response.data.link_token }; // Return as an object 
  } catch (error) {
    console.error('Error creating link token:', error);
    return null; // Ensure the function does not throw
  }
}

export const updateLinkToken = async (user: User, accessToken: string) => {  
  try {  
    const tokenParams = {  
      user: {  
        client_user_id: user.$id  
      },  
      client_name: `${user.firstName} ${user.lastName}`,  
      access_token: accessToken,  
      products: ['auth', 'transactions'] as Products[],  
      language: 'en',  
      country_codes: ['US'] as CountryCode[],  
    }  

    const response = await plaidClient.linkTokenCreate(tokenParams);  
    return { linkToken: response.data.link_token };  
  } catch (error) {  
    console.error('Error creating update link token:', error);  
    return null;  
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

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();
    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('userId',[userId])]
    )
    if (!banks) throw error;
    return parseStringify(banks.documents);
  } catch (error) {
    console.error("An error occur while getBanks:", error);
  }
}

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();
    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('$id',[documentId])]
    )
    if (!bank) throw error;
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("An error occur while getBanks:", error);
  }
} 

export const getBankByAccountId = async ({ accountId }: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();
    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal('accountId',[accountId])]
    )
    
    if (bank.total !==1) return null;
    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("An error occur while getBanks:", error);
  }
} 

export const createPrivateBankAccount = async ({
  privateBankId,
  userId,
  privateBankNumber,
  availableBalance,
  currentBalance,
  type,
  shareableId
}: createPrivateBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const privateBankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        privateBankId,
        privateBankNumber,
        availableBalance,
        currentBalance,
        type,
        shareableId,
      }
    );
    return parseStringify(privateBankAccount);
  } catch (error) {
    console.log('create Private Bank Error:',error)
  }
}

export const getPrivateBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();
    const privateBanks = await database.listDocuments(
      DATABASE_ID!,
      PRIVATE_BANK_COLLECTION_ID!,
      [Query.equal('userId',[userId])]
    )
    if (!privateBanks) throw error;
    return parseStringify(privateBanks.documents);
  } catch (error) {
    console.error("An error occur while getBanks:", error);
  }
}