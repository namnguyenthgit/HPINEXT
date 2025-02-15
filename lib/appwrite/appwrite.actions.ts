"use server";

import { Client, Account, Databases, Users, Query , ID } from "node-appwrite";
import { cookies } from "next/headers";
import { appConfig } from "../appconfig";

const COOKIE_NAME = appConfig.cookie_name; 
export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  //const session = cookies.get("appwrite-session");
  if (!session || !session.value) {
    //console.log("No session available");
    throw new Error("No session");
  }
  // Log the session to ensure it's correct
  //console.log('Session value:', session.value);
  
  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_KEY!);

  return {
    get account() {
      return new Account(client);
    },
    get database() {
      return new Databases(client);
    },
    get user() {
      return new Users(client);
    }
  };
}
//appwrite backup-restore
// Define base document type  
interface appwriteDocument {  
  $id: string;  
  $createdAt: string;  
  $updatedAt: string;  
  [key: string]: unknown;  
}

interface appwriteUserData {  
  $id: string;  
  $createdAt: string;  
  $updatedAt: string;  
  name: string;  
  email: string;  
  phone?: string;  
  emailVerification: boolean;  
  phoneVerification: boolean;  
  status: boolean;  
  labels?: string[];  
  prefs?: Record<string, unknown>;  
} 

// Define types for backup data  
interface appwriteCollectionBackup {  
  name: string;  
  documents: appwriteDocument[];  
}  

export interface appwriteDatabaseBackup {  
  timestamp: string;  
  collections: {  
      [key: string]: appwriteCollectionBackup;  
  };
  users: appwriteUserData[];
} 

interface appwriteCollectionBackupData {  
  timestamp: string;  
  collectionId: string;  
  documents: appwriteDocument[];  
}

interface appwriteRestoreResult {  
  success: boolean;  
  message: string;  
  errors?: string[];  
  stats: {  
      users: number;  
      documents: number;  
  };  
}

export async function backupDatabaseAndAuth(): Promise<appwriteDatabaseBackup> {  
  try {  
    const admin = await createAdminClient();  
    const databases = admin.database;  
    const users = admin.user;  
    
    // Backup collections  
    const collections = await databases.listCollections(  
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!  
    );  

    const backupData: appwriteDatabaseBackup = {  
        timestamp: new Date().toISOString(),  
        collections: {},  
        users: []  
    };  

    // Backup each collection with pagination  
    for (const collection of collections.collections) {  
      let documentsOffset = 0;  
      const documentsLimit = 100; // Appwrite's maximum limit per request  
      let hasMoreDocuments = true;  
      const allDocuments: appwriteDocument[] = [];
      while (hasMoreDocuments) {
        console.log(`Backing up collection ${collection.name}: ${allDocuments.length} documents so far...`);
        const documents = await databases.listDocuments(  
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
          collection.$id,  
          [  
            Query.limit(documentsLimit),  
            Query.offset(documentsOffset)  
          ]  
        );  

        allDocuments.push(...documents.documents as appwriteDocument[]);  

        if (documents.documents.length < documentsLimit) {  
          hasMoreDocuments = false;  
        } else {  
          documentsOffset += documentsLimit;  
        }  
      }  
      
      backupData.collections[collection.$id] = {  
        name: collection.name,  
        documents: allDocuments  
      };  
    }  

    // Backup users  
    let offset = 0;  
    const limit = 100; // Appwrite's maximum limit per request  
    let hasMoreUsers = true;  

    while (hasMoreUsers) {  
      const usersList = await users.list(  
        [  
          Query.limit(limit),  
          Query.offset(offset)  
        ]  
      );  

      backupData.users.push(...usersList.users as appwriteUserData[]);  

      if (usersList.users.length < limit) {  
        hasMoreUsers = false;  
      } else {  
        offset += limit;  
      }  
    }  

    return backupData;  
  } catch (error) {  
    console.error('Backup failed:', error);  
    throw new Error('Failed to create backup');  
  }  
}

export async function appwriteBackupCollection(collectionId: string): Promise<appwriteCollectionBackupData> {  
  try {  
      const admin = await createAdminClient();  
      const databases = admin.database;  

      const documents = await databases.listDocuments(  
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
          collectionId  
      );  

      return {  
          timestamp: new Date().toISOString(),  
          collectionId,  
          documents: documents.documents as appwriteDocument[]  
      };  
  } catch (error) {  
      console.error(`Failed to backup collection ${collectionId}:`, error);  
      throw new Error(`Failed to backup collection ${collectionId}`);  
  }  
}  

export async function appwriteRestoreData(backupData: appwriteDatabaseBackup): Promise<appwriteRestoreResult> {  
  try {  
      const admin = await createAdminClient();  
      const databases = admin.database;  
      const users = admin.user;  
      const errors: string[] = [];  
      const stats = {  
          users: 0,  
          documents: 0,  
          skipped: 0  
      };  

      // Restore users first  
      for (const userData of backupData.users) {  
          try {  
              const {   
                  $id,   
                  $createdAt,   
                  $updatedAt,   
                  email,  
                  name,  
                  ...userDataToRestore   
              } = userData;  
              
              const existingUsers = await users.list([  
                  Query.equal('email', email)  
              ]);  

              if (existingUsers.total === 0) {  
                  const temporaryPassword = ID.unique();  
                  await users.create(  
                      ID.unique(),  
                      email,  
                      undefined,  
                      temporaryPassword,  
                      name  
                  );  
                  stats.users++;  
              } else {  
                  stats.skipped++;  
              }  
          } catch (e) {  
              const error = `Failed to restore user ${userData.email}: ${(e as Error).message}`;  
              console.error(error);  
              errors.push(error);  
          }  
      }  

      // Restore documents  
      for (const [collectionId, data] of Object.entries(backupData.collections)) {  
          const { documents } = data;  
          
          for (const doc of documents) {  
              try {  
                  // Remove all system attributes  
                  const {   
                      $id,   
                      $createdAt,   
                      $updatedAt,  
                      $databaseId,    // Remove database ID  
                      $collectionId,  // Remove collection ID  
                      $permissions,   // Remove permissions  
                      ...documentData
                  } = doc;  

                  try {  
                      // Try to get document by ID  
                      await databases.getDocument(  
                          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
                          collectionId,  
                          $id  
                      );  
                      // If document exists, skip it  
                      stats.skipped++;  
                      console.log(`Skipped existing document ID: ${$id} in ${collectionId}`);  
                      continue;  
                  } catch (error) {  
                      // If document doesn't exist (404 error), create it  
                      await databases.createDocument(  
                          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
                          collectionId,  
                          ID.unique(), // Generate new ID  
                          documentData  
                      );  
                      stats.documents++;  
                  }  
              } catch (e) {  
                  const error = `Failed to process document in ${collectionId}: ${(e as Error).message}`;  
                  console.error(error);  
                  errors.push(error);  
              }  
          }  
      }  

      return {  
          success: errors.length === 0,  
          message: `Restore completed: ${stats.documents} created, ${stats.skipped} skipped`,  
          errors: errors.length > 0 ? errors : undefined,  
          stats  
      };  
  } catch (error) {  
      console.error('Restore failed:', error);  
      throw new Error('Failed to restore data');  
  }  
}