'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite/appwrite.actions";
import { cookies } from "next/headers";
import { error } from "console";
import { appwriteConfig } from "../appwrite/appwrite-config";
import { parseStringify } from "../utils";
import { getUserInfoProps, signInProps, SignUpParams } from "@/types";

interface SignInUpError {
  code?: number;
  type?: string;
  message?: string;
}

const DATABASE_ID = appwriteConfig.databaseId
const USER_COLLECTION_ID = appwriteConfig.userCollectionId

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
    const { account, database, user } = await createAdminClient();
    const userData = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId',[userId])]
    )

    // First get user verification status  
    const userAccount = await user.get(userId);

    //console.log('useraction-getUserInfo user:',user);
    if (!userData || userData.documents.length === 0) {  
      return {  
        code: 404,  
        type: 'user_not_found',  
        message: 'User data not found'  
      };  
    }

    // If email is not verified, return verification error
    //console.log('getUserInfo userAccount:',userAccount);
    if (!userAccount.emailVerification) {  
      return {  
        code: 401,  
        type: 'email_not_verified',  
        message: 'Please contact IT verify your account!'  
      };  
    }
    return parseStringify(userData.documents[0]);
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
      cookieStore.set("appwrite-session", session.secret, {
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

  try {  
      const { account, database } = await createAdminClient();  
      
      try {  
        newUserAccount = await account.create(  
          ID.unique(),   
          email,   
          password,   
          `${firstName} ${lastName}`  
        );  
        
        if (!newUserAccount) {  
          return {
            success: false,
            code: 400,  
            type: 'account_creation_failed',  
            message: 'Failed to create user account'  
          };  
        }  
      } catch (error: unknown) {  
        const typedError = error as SignInUpError;  
        return {
          success: false,
          code: 400,  
          type: 'account_creation_failed',  
          message: typedError?.message || 'Failed to create user account'  
        };  
      }  

      newUser = await database.createDocument(  
        DATABASE_ID!,  
        USER_COLLECTION_ID!,  
        ID.unique(),  
        {  
          ...userData,  
          userId: newUserAccount.$id,  
        }  
      );  
      
      // const session = await account.createEmailPasswordSession(email, password);  
      
      // const cookieStore = await cookies();  
      // cookieStore.set("appwrite-session", session.secret, {  
      //   path: "/",  
      //   httpOnly: true,  
      //   sameSite: "strict",  
      //   secure: true,  
      // });  

      // return parseStringify(newUser); 
      return {
        success: true,
        code: 200,  
        type: 'signup_success',  
        message: 'Account created successfully. Please verify your email before signing in.',  
        user: parseStringify(newUser)  
      };
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
    const cookieStore = await cookies();
    cookieStore.delete('appwrite-session');
    try {
      await account.deleteSession('current');  
    } catch (sessionError) {
      console.log("Session deletion:", sessionError);
    }
    return { success: true };
  } catch (error) {
    console.error('Error during logout:', error);
    return { success: false };
  }
}