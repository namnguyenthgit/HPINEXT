"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { appwriteConfig } from "../appwrite-config";

const DATABASE_ID = appwriteConfig.databaseId
const TRANSACTION_COLLECTION_ID = appwriteConfig.transactionCollectionId

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    const newTransaction = await database.createDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      ID.unique(),
      {
        channel: 'hpi-next',
        status: 'processing',
        ...transaction
      }
    )
    return parseStringify(newTransaction);
  } catch (error) {
    console.log(error);
  }
}

export const updateTransaction = async ({ documentId, data }: UpdateTransactionProps) => {
  try {
    const { database } = await createAdminClient();

    //console.log('Updating transaction:', { documentId, data });

    const updatedTransaction = await database.updateDocument(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      documentId,
      data
    )
    return parseStringify(updatedTransaction);
  } catch (error) {
    console.error('transaction-action updateTransaction error:', error);
    throw error;
  }
}

export const getTransactionsByEmail = async ({email}: getTransactionsByEmailProps) => {
  try {
    const { database } = await createAdminClient();

    const transactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [Query.equal('email', email)],
    )

    // const receiverTransactions = await database.listDocuments(
    //   DATABASE_ID!,
    //   TRANSACTION_COLLECTION_ID!,
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

export const getTransactionsByDocNo = async (lsDocumentNo: string) => {
  try {

    //console.log('getTransactionsByDocNo Input lsDocumentNo:', lsDocumentNo);
    const { database } = await createAdminClient();

    const transactions = await database.listDocuments(
      DATABASE_ID!,
      TRANSACTION_COLLECTION_ID!,
      [  
        // Make sure to use the exact field name as in your Appwrite collection  
        Query.equal('lsDocumentNo', [lsDocumentNo])  // Note the array syntax  
      ]
    )
    //console.log('Query result:', transactions.documents);

    return transactions.documents[0] || null;
  } catch (error) {
    console.log(error);
    throw error;
  }
}