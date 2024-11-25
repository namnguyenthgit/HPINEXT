"use client";  

import { Client, Databases, Account } from 'appwrite'; 
import { appwriteConfig } from './appwrite-config';

export let client: Client | null = null;  
export let databases: Databases | null = null;  
export let account: Account | null = null;  

if (typeof window !== "undefined") {  
  client = new Client();  
  client  
    .setEndpoint(appwriteConfig.endpoint)  
    .setProject(appwriteConfig.projectId);  

  databases = new Databases(client);  
  account = new Account(client);  
}