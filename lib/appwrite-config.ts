export const appwriteConfig = {  
    endpoint: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,  
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT!,  
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,  
    userCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USER_COLLECTION_ID!,
    payPortalTransCollectionId: process.env.NEXT_PUBLIC_APPWRITE_PAYPORTALTRANS_COLLECTION_ID!    
  } 