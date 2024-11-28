export const appwriteConfig = {  
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,  
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,  
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
    userCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
    bankCollectionId: process.env.NEXT_PUBLIC_APPWRITE_BANK_COLLECTION_ID!,
    transactionCollectionId: process.env.NEXT_PUBLIC_APPWRITE_TRANSACTION_COLLECTION_ID!
  } 