
"use client";  

import { client } from '@/lib/appwrite/appwrite-client';  
import { RealtimeResponseEvent } from 'appwrite';  
import { appwriteConfig } from '@/lib/appwrite/appwrite-config';
import { PayPortalTrans } from '@/types';

export const subscribeToPayportalTrans = (  
  onCreate: (pptrans: PayPortalTrans) => void,  
  onUpdate: (pptrans: PayPortalTrans) => void,  
  onDelete: (pptransId: string) => void  
): (() => void) => {  
  const subscription = client.subscribe(  
    `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.payPortalTransCollectionId}.documents`,  
    (response: RealtimeResponseEvent<PayPortalTrans>) => {  
      const eventType = response.events[0];  
      const pptrans = response.payload;  

      if (eventType.endsWith('.create')) {  
        onCreate(pptrans);  
      } else if (eventType.endsWith('.update')) {  
        onUpdate(pptrans);  
      } else if (eventType.endsWith('.delete')) {  
        onDelete(pptrans.$id);  
      }  
    }  
  );  

  // Return unsubscribe function  
  return () => {  
    subscription();  
  };  
};