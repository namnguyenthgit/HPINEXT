'use server';

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

interface SignInError {
  code?: number;
  type?: string;
  message?: string;
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

export const signUp = async (userData: SignUpParams) => {
    try {
        // Create a user account
        const { email, password, firstName, lastName } = userData;
        const { account } = await createAdminClient();

        const newUserAccount = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);

        if(!newUserAccount) throw new Error('Error creating user')

        const session = await account.createEmailPasswordSession(email, password);
        
        const cookieStore = await cookies();
        cookieStore.set("appwrite-session", session.secret, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: true,
        });

        return parseStringify(newUserAccount);
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