'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite/appwrite.actions";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import { CountryCode, ProcessorTokenCreateRequest, ProcessorTokenCreateRequestProcessorEnum, Products } from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";
import { error } from "console";
import { appwriteConfig } from "../appwrite/appwrite-config";

interface SignInUpError {
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
    //console.log('useraction-getUserInfo user:',user);
    if (!user || user.documents.length === 0) {  
      return {  
        code: 404,  
        type: 'user_not_found',  
        message: 'User data not found'  
      };  
    }  
    return parseStringify(user.documents[0]);
  } catch (error) {
    console.error("An error occur while getUserInfo:", error);
    return {  
      code: 500,  
      type: 'database_error',  
      message: 'Failed to fetch user information'  
    };
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
      //Mutation/ Database / Make fetch
      const { account } = await createAdminClient();
      const session = await account.createEmailPasswordSession(email, password);

      //console.log('useraction-signin response:',session);
      // Use cookies() with await
      const cookieStore = await cookies();
      cookieStore.set("hpinext-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
      });
      //console.log('useraction-signin session.userId:',session.userId);
      const user = await getUserInfo({ userId: session.userId})
      //console.log('useraction-signin user:',user);
      
      // Check if user is an error response  
      if ('code' in user && 'type' in user) {  
        return user; // Return the error object  
      }

      return parseStringify(user);
  } catch (error: unknown) {
    const typedError = error as SignInUpError; // Cast to known type
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
  let newUser;
  let dwollaCustomerUrl;
  try {
      // Create a user account
      
      const { account, database, user } = await createAdminClient();
      // Step 1: Create Appwrite account   
      try {  
        newUserAccount = await account.create(  
          ID.unique(),   
          email,   
          password,   
          `${firstName} ${lastName}`  
        );  
        
        if (!newUserAccount) {  
          return {  
            code: 400,  
            type: 'account_creation_failed',  
            message: 'Failed to create user account'  
          };
        }  
      } catch (error: unknown) {
        const typedError = error as SignInUpError; // Cast to known type
        return {  
          code: 400,  
          type: 'account_creation_failed',  
          message: typedError?.message || 'Failed to create user account'  
        };  
      }
      
      // Step 2: Create Dwolla customer
      try {
        dwollaCustomerUrl = await createDwollaCustomer({
          ...userData,
          type: "personal",
        });
        if (!dwollaCustomerUrl) {  
          // Cleanup Appwrite account if Dwolla creation fails  
          await user.delete(newUserAccount.$id);  
          return {  
            code: 400,  
            type: 'dwolla_creation_failed',  
            message: 'Failed to create Dwolla customer'  
          };  
        }

        const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);
        newUser = await database.createDocument(
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
        cookieStore.set("hpinext-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });

        //return parseStringify(newUserAccount);
        return parseStringify(newUser);
      } catch (error : unknown) {
        const typedError = error as SignInUpError; // Cast to known type
        if (newUser) {  
          try {  
            await database.deleteDocument(  
              DATABASE_ID!,  
              USER_COLLECTION_ID!,  
              newUser.$id  
            );  
          } catch (deleteError) {  
            console.error('Error deleting user document during rollback:', deleteError);  
          }  
        }  
      
        if (newUserAccount) {  
          try {  
            await user.delete(newUserAccount.$id);  
          } catch (deleteError) {  
            console.error('Error deleting auth account during rollback:', deleteError);  
          }  
        }  

        return {  
          code: 500,  
          type: 'registration_failed',  
          message: typedError?.message || 'Failed to complete registration process'  
        }; 
      }
  } catch (error: unknown) {
    console.error('Error during signup:', error);  
    return {  
      code: 500,  
      type: 'unexpected_error',  
      message: 'An unexpected error occurred during signup'  
    };  
  }
}
  
export async function getLoggedInUser() {
  try {
    // Get session from cookies
    const cookieStore = await cookies();
    const session = cookieStore.get('hpinext-session');

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
      if (!result || !result.$id) {  
        console.log("No valid account found");  
        return null;  
      }
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
    (await cookies()).delete('hpinext-session');
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
  bankName,
  privateAccountNumber,
  bankCardNumber,
  availableBalance,
  currentBalance,
  type,
  shareableId,
  userId,
}: createPrivateBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const privateBankAccount = await database.createDocument(
      DATABASE_ID!,
      PRIVATE_BANK_COLLECTION_ID!,
      ID.unique(),
      {
        privateBankId,
        bankName,
        privateAccountNumber,
        bankCardNumber,
        availableBalance,
        currentBalance,
        type,
        shareableId,
        userId,
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