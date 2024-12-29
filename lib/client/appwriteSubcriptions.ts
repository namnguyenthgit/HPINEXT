"use client";  

import { client } from '@/lib/appwrite-client';  
import { RealtimeResponseEvent } from 'appwrite';

// Generic type T to handle different document types  
export const subscribeToCollection = <T extends { $id: string }>(  
  databaseId: string,  
  collectionId: string,  
  onCreate?: (document: T) => void,  
  onUpdate?: (document: T) => void,  
  onDelete?: (documentId: string) => void  
): (() => void) => {  
  // Subscribe to specific database and collection  
  const subscription = client.subscribe(  
    `databases.${databaseId}.collections.${collectionId}.documents`,  
    (response: RealtimeResponseEvent<T>) => {  
      const eventType = response.events[0];  
      const document = response.payload;  

      if (eventType.endsWith('.create') && onCreate) {  
        onCreate(document);  
      } else if (eventType.endsWith('.update') && onUpdate) {  
        onUpdate(document);  
      } else if (eventType.endsWith('.delete') && onDelete) {  
        onDelete(document.$id);  
      }  
    }  
  );  

  return () => {  
    subscription();  
  };  
};  

// Subscribe to multiple collections  
export const subscribeToCollections = <T extends { $id: string }>(  
  subscriptions: Array<{  
    databaseId: string;  
    collectionId: string;  
    onCreate?: (document: T) => void;  
    onUpdate?: (document: T) => void;  
    onDelete?: (documentId: string) => void;  
  }>  
): (() => void) => {  
  const unsubscribeFunctions = subscriptions.map(subscription =>   
    subscribeToCollection<T>(  
      subscription.databaseId,  
      subscription.collectionId,  
      subscription.onCreate,  
      subscription.onUpdate,  
      subscription.onDelete  
    )  
  );  

  // Return function that unsubscribes from all subscriptions  
  return () => {  
    unsubscribeFunctions.forEach(unsubscribe => unsubscribe());  
  };  
};