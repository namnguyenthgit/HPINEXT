'use server';

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite/appwrite.actions";
import { cookies } from "next/headers";
import { error } from "console";
import { appwriteConfig } from "../appwrite/appwrite-config";
import { parseStringify } from "../utils";
import { getUserInfoProps, signInProps, SignUpParams } from "@/types";
import { appConfig } from "../appconfig";

interface SignInUpError {
  code?: number;
  type?: string;
  message?: string;
}

interface AppwriteError {
  code?: number;
  type?: string;
  message?: string;
}

interface SessionInfo {
  userId: string;
  expires: number;
}

const DATABASE_ID = appwriteConfig.databaseId
const USER_COLLECTION_ID = appwriteConfig.userCollectionId
const COOKIE_NAME = appConfig.cookie_name;

// Token handling functions  
export const getServerSession = async () => {
  try {
    const { account } = await createAdminClient();
    const session = await account.getSession('current');

    return {
      userId: session.userId,
      expires: new Date(session.expire).getTime()
    };
  } catch (error) {
    console.error('Failed to get server session:', error);
    return null;
  }
};

export const parseSessionToken = async (token: string): Promise<SessionInfo | null> => {
  try {
    // The token we stored is in format: { id: string, secret: string }  
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const data = JSON.parse(decoded);
    //console.log('useraction-parseSessionToken-decodedtoken:', JSON.stringify(data, null, 2));
    return {
      userId: data.id,
      // Since we don't have expiration in the token,   
      // we'll use the cookie's expiration time  
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now  
    };
  } catch (error) {
    console.error('Failed to parse session token:', error);
    return null;
  }
};

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
    const { database, user } = await createAdminClient();
    const userData = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal('userId', [userId])]
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

export async function getUserRole() {
  try {
    const client = await createSessionClient();
    const account = client.account;

    // Get current user  
    const user = await account.get();

    // Check if user has admin label  
    const isAdmin = user.labels?.includes('admin') ?? false;

    return isAdmin ? 'admin' : 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user'; // Default to user role if there's an error  
  }
}

export const signIn = async ({ email, password }: signInProps) => {
  try {
    //Mutation/ Database / Make fetch
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);
    //console.error('signIn createEmailPasswordSession');
    //console.log('useraction-signin response:',session);
    if (!session) {
      throw new Error('Failed to create session login');
    }

    // Use cookies() with await
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      expires: new Date(session.expire),
      domain: process.env.NEXT_PUBLIC_SITE_URL
        ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
        : undefined,
    });
    //console.log('useraction-signin cookieStore:',cookieStore);
    try {
      //const accountInfo = await account.get();  
      const user = await getUserInfo({ userId: session.userId });

      if ('code' in user && 'type' in user) {
        return user;
      }
      return parseStringify(user);
    } catch (error) {
      console.log('Server has no session, user Account get error:', error);
      return null;
    }

  } catch (error: unknown) {
    const typedError = error as AppwriteError; // Cast to known type
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

export const signUp = async ({ password, ...userData }: SignUpParams) => {
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
    // cookieStore.set(COOKIE_NAME, session.secret, {  
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
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    // If no session exists, return null or throw error
    if (!sessionCookie || !sessionCookie.value) {
      console.log("No session available");
      return null; // Handle this case (e.g., return null or redirect to login page)
    }

    const { account } = await createSessionClient();
    const result = await account.get();
    const user = await getUserInfo({ userId: result.$id })
    if (!result || !result.$id) {
      console.log("No valid account found");
      return null;
    }
    return parseStringify(user)
  } catch (error) {
    console.error('While user.action getLoggedInUser Internal server error:', error);
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
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

export async function googleSignIn(token: string) {
  try {
    // Call your backend API to verify the token  
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        code: response.status,
        message: data.message || 'Google authentication failed',
        type: data.type || 'google_auth_error',
      };
    }

    return data;
  } catch (error) {
    console.error('Google sign-in error:', error);
    return {
      code: 500,
      message: 'Internal server error during Google authentication',
      type: 'server_error',
    };
  }
} 
