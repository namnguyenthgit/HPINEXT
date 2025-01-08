"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite/appwrite.actions";
import { parseStringify } from "../utils";
import { appwriteConfig } from "../appwrite/appwrite-config";
import { CreatePayPortalTransProps, getPayPortalTransByEmailProps, PayPortalTrans, UpdatePayPortalTransProps } from "@/types";

const DATABASE_ID = appwriteConfig.databaseId
const PAYPORTALTRANS_COLLECTION_ID = appwriteConfig.payPortalTransCollectionId

export interface appwritePayportalTransResponse {  
  total: number;  
  documents: PayPortalTrans[];  
}

interface appwritePayportalTransError {  
  message: string;  
  code: number;  
  response?: unknown;  
  type?: string;  
} 

export const createPayPortalTrans = async (transaction: CreatePayPortalTransProps) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      PAYPORTALTRANS_COLLECTION_ID!,
      ID.unique(),
      {
        status: 'processing',
        ...transaction
      }
    )
    return parseStringify(newTransaction);
  } catch (error) {
    console.log(error);
  }
}

export const updatePayPortalTrans = async ({ documentId, data }: UpdatePayPortalTransProps) => {
  try {
    const { database } = await createAdminClient();

    //console.log('Updating transaction:', { documentId, data });

    const updatedTransaction = await database.updateDocument(
      DATABASE_ID!,
      PAYPORTALTRANS_COLLECTION_ID!,
      documentId,
      data
    )
    return parseStringify(updatedTransaction);
  } catch (error) {
    console.error('transaction-action updateTransaction error:', error);
    throw error;
  }
}

export const getPayPortalTransByEmail = async ({email}: getPayPortalTransByEmailProps) => {
  try {
    const { database } = await createAdminClient();

    const transactions = await database.listDocuments(
      DATABASE_ID!,
      PAYPORTALTRANS_COLLECTION_ID!,
      [Query.equal('email', email)],
    )

    // const receiverTransactions = await database.listDocuments(
    //   DATABASE_ID!,
    //   PAYPORTALTRANS_COLLECTION_ID!,
    //   [Query.equal('receiverBankId', bankId)],
    // );

    // const transactions = {
    //   total: senderTransactions.total + receiverTransactions.total,
    //   documents: [
    //     ...senderTransactions.documents, 
    //     ...receiverTransactions.documents,
    //   ]
    // }

    return parseStringify(transactions);
  } catch (error) {
    console.log(error);
  }
}

export const getPayPortalTransByDocNo = async (lsDocumentNo: string) => {
  try {

    //console.log('getTransactionsByDocNo Input lsDocumentNo:', lsDocumentNo);
    const { database } = await createAdminClient();

    const payPortalTrans = await database.listDocuments(
      DATABASE_ID!,
      PAYPORTALTRANS_COLLECTION_ID!,
      [  
        // Make sure to use the exact field name as in your Appwrite collection  
        Query.equal('lsDocumentNo', [lsDocumentNo])  // Note the array syntax  
      ]
    )
    //console.log('Query result:', transactions.documents);
    return payPortalTrans.documents[0] || null;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export const getPayPortalTransByStores = async (storeList: string[]): Promise<appwritePayportalTransResponse> => {  
  try {  
    const { database } = await createAdminClient();  

    console.log("Original storeList:", storeList);  

    // Ensure we have an array of individual store IDs  
    const stores: string[] = Array.isArray(storeList)   
      ? storeList[0].includes(',')  
        ? storeList[0].split(',').map((s: string) => s.trim())  
        : storeList  
      : [storeList];  

    console.log("Processing stores:", stores);  

    const transactions = await database.listDocuments(  
      DATABASE_ID!,  
      PAYPORTALTRANS_COLLECTION_ID!,  
      [  
        Query.equal('terminalId', stores),  
        Query.orderDesc('$createdAt'),  
        Query.limit(100)  
      ]  
    );  

    console.log("Query result:", transactions);  
    return transactions as appwritePayportalTransResponse;  
  } catch (error: unknown) {  
    const appwriteError = error as appwritePayportalTransError;  
    console.error('Error fetching transactions by stores:', appwriteError.message);  
    if (appwriteError.response) {  
      console.error('Error details:', appwriteError.response);  
    }  
    throw error;
  }  
};

export const deletePayPortalTrans = async (documentId: string) => {  
  try {  
    const { database } = await createAdminClient();  

    const deletePayPortalTrans = await database.deleteDocument(  
      DATABASE_ID!,  
      PAYPORTALTRANS_COLLECTION_ID!,  
      documentId  
    );  

    return parseStringify(deletePayPortalTrans);  
  } catch (error) {  
    console.error('Delete PayPortalTrans error:', error);  
    throw error;  
  }  
};  

// If you want to delete by lsDocumentNo instead of documentId  
export const deletePayPortalTransByDocNo = async (lsDocumentNo: string) => {  
  try {  
    const { database } = await createAdminClient();  

    // First, find the transaction  
    const payPortalTrans = await getPayPortalTransByDocNo(lsDocumentNo);  
    
    if (!payPortalTrans) {  
      throw new Error(`No transaction found for document number: ${lsDocumentNo}`);  
    }  

    // Then delete it using its ID  
    const deletePayPortalTrans = await database.deleteDocument(  
      DATABASE_ID!,  
      PAYPORTALTRANS_COLLECTION_ID!,  
      payPortalTrans.$id  
    );  

    return parseStringify(deletePayPortalTrans);  
  } catch (error) {  
    console.error('Delete PayPortalTrans by DocNo error:', error);  
    throw error;  
  }  
};  

// If you want to delete multiple transactions at once  
export const deleteMultiplePayPortalTrans = async (documentIds: string[]) => {  
  try {  
    const { database } = await createAdminClient();  

    const deletePromises = documentIds.map(id =>   
      database.deleteDocument(  
        DATABASE_ID!,  
        PAYPORTALTRANS_COLLECTION_ID!,  
        id  
      )  
    );  

    const results = await Promise.all(deletePromises);  
    return parseStringify(results);  
  } catch (error) {  
    console.error('Delete multiple PayPortalTrans error:', error);  
    throw error;  
  }  
};