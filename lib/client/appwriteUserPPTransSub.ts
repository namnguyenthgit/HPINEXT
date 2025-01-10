"use client";  

import { client } from '@/lib/appwrite/appwrite-client';  
import { RealtimeResponseEvent } from 'appwrite';  
import { appwriteConfig } from '@/lib/appwrite/appwrite-config';  
import { PayPortalTrans, User } from '@/types';  

interface SubscriptionHandlers {  
  onUserChange?: (user: User) => void;  
  onTransactionStatusChange?: (transaction: PayPortalTrans) => void;  
}  

export interface RealtimeUser extends User {  
    $previous?: Partial<User>;  
}

export interface RealtimePayPortalTrans extends PayPortalTrans {  
    $previous?: Partial<PayPortalTrans>;  
}

// Define which fields to monitor   
export const MONITORED_FIELDS = ['status', 'lsDocumentNo', 'payPortalName'] as const;  
export type MonitoredFields = typeof MONITORED_FIELDS[number]; 

interface SubscriptionHandlers {  
  onUserChange?: (user: User) => void;  
  onTransactionChange?: (  
    transaction: PayPortalTrans,  
    changedFields: MonitoredFields[]  
  ) => void;  
}
  
export const subcribePayportalTrans = (  
  userId: string,  
  storeIds: string[],  
  fieldsToMonitor: readonly MonitoredFields[],  
  handlers: SubscriptionHandlers  
): (() => void) => {  
  const userSubscription = client.subscribe(  
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents.${userId}`,  
    (response: RealtimeResponseEvent<RealtimeUser>) => {  
      handlers.onUserChange?.(response.payload);  
    }  
  );  

  const transSubscription = client.subscribe(  
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.payPortalTransCollectionId}.documents`,  
    (response: RealtimeResponseEvent<RealtimePayPortalTrans>) => {  
      const transaction = response.payload;  
      const previousData = transaction.$previous || {};  

      const changedFields = fieldsToMonitor.filter(field =>   
        previousData[field] !== transaction[field]  
      ) as MonitoredFields[];  
      
      if (changedFields.length > 0 && storeIds.includes(transaction.terminalId)) {  
        const { $previous, ...transactionData } = transaction;  
        handlers.onTransactionChange?.(transactionData, changedFields);  
      }  
    }  
  );  

  return () => {  
    userSubscription();  
    transSubscription();  
  };  
};