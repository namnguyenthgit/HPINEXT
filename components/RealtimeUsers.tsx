"use client";  

import { client, databases } from "@/lib/appwrite-client";  
import { appwriteConfig } from "@/lib/appwrite-config";  
import { RealtimeResponseEvent, Models, Client, Databases, Query } from "appwrite";  
import { useState, useEffect } from "react";  

type User = Models.Document & {  
  email: string;  
  userId: string;  
  dwollaCustomerUrl: string;  
  dwollaCustomerId: string;  
  firstName: string;  
  lastName: string;  
  name: string;  
  address1: string;  
  city: string;  
  state: string;  
  postalCode: string;  
  dateOfBirth: string;  
  ssn: string;  
};  

interface RealtimeUsersProps {  
  initialUsers: User[];  
}  

interface RealtimePayload extends Models.Document {  
  [key: string]: unknown;  
}  

export default function RealtimeUsers({ initialUsers }: RealtimeUsersProps) {  
  const [users, setUsers] = useState<User[]>(initialUsers);  
  const [isConnected, setIsConnected] = useState(false);

  // Add initial data fetching  
  useEffect(() => {  
    const fetchUsers = async () => {  
      if (!databases) return;  
      
      try {  
        const response = await databases.listDocuments<User>(  
          appwriteConfig.databaseId,  
          appwriteConfig.userCollectionId,  
          [  
            Query.orderDesc('$createdAt'),  
            // Add any other queries you need  
          ]  
        );  
        setUsers(response.documents);  
      } catch (error) {  
        console.error('Error fetching users:', error);  
      }  
    };  

    fetchUsers();  
  }, []);

  useEffect(() => {  
    // Debug initial users  
    console.log('Initial users:', initialUsers);  

    if (!client || !databases) {  
      console.error('Appwrite client or databases not initialized');  
      return;  
    }  

    const appwriteClient = client as Client;  
    const appwriteDatabase = databases as Databases;  

    let unsubscribe: (() => void) | undefined;  

    const setupRealtimeSubscription = () => {  
      try {  
        // Debug configuration  
        console.log('Config:', {  
          databaseId: appwriteConfig.databaseId,  
          collectionId: appwriteConfig.userCollectionId  
        });  

        const subscriptionChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents`;  
        console.log('Setting up subscription for:', subscriptionChannel);  

        unsubscribe = appwriteClient.subscribe(  
          [subscriptionChannel],  
          (response: RealtimeResponseEvent<RealtimePayload>) => {  
            // Debug received event  
            console.log("Realtime event received:", {  
              events: response.events,  
              payload: response.payload  
            });  

            try {  
              // Handle document creation  
              if (response.events.includes(`databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents.create`)) {  
                console.log('Create event detected');  
                appwriteDatabase  
                  .getDocument<User>(  
                    appwriteConfig.databaseId,  
                    appwriteConfig.userCollectionId,  
                    response.payload.$id  
                  )  
                  .then((newUser) => {  
                    console.log('Retrieved new user:', newUser);  
                    setUsers((prev) => {  
                      const updated = [...prev, newUser];  
                      console.log('Updated users state:', updated);  
                      return updated;  
                    });  
                  })  
                  .catch((error) => {  
                    console.error("Error fetching new user:", error);  
                  });  
              }  

              // Handle document update  
              if (response.events.includes(`databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents.update`)) {  
                console.log('Update event detected');  
                setUsers((prev) => {  
                  const updated = prev.map((user) =>  
                    user.$id === response.payload.$id  
                      ? { ...user, ...(response.payload as Partial<User>) }  
                      : user  
                  );  
                  console.log('Updated users after update:', updated);  
                  return updated;  
                });  
              }  

              // Handle document deletion  
              if (response.events.includes(`databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents.delete`)) {  
                console.log('Delete event detected');  
                setUsers((prev) => {  
                  const updated = prev.filter((user) => user.$id !== response.payload.$id);  
                  console.log('Updated users after deletion:', updated);  
                  return updated;  
                });  
              }  
            } catch (error) {  
              console.error('Error processing realtime event:', error);  
            }  
          }  
        );  

        setIsConnected(true);  
        console.log('Subscription setup completed');  
      } catch (error) {  
        console.error('Error setting up realtime subscription:', error);  
        setIsConnected(false);  
      }  
    };  

    // Initial subscription setup  
    setupRealtimeSubscription();  

    const handleReconnect = () => {  
      console.log("Attempting to reconnect...");  
      if (unsubscribe) {  
        unsubscribe();  
      }  
      setupRealtimeSubscription();  
    };  

    // Connection status listeners  
    const connectedUnsubscribe = appwriteClient.subscribe("connected", () => {  
      console.log("Connected to Appwrite realtime");  
      setIsConnected(true);  
    });  

    const disconnectedUnsubscribe = appwriteClient.subscribe("disconnected", () => {  
      console.log("Disconnected from Appwrite realtime");  
      setIsConnected(false);  
      setTimeout(handleReconnect, 1000);  
    });  

    // Debug current subscription  
    console.log('Current subscription status:', isConnected);  

    return () => {  
      console.log('Cleaning up subscriptions');  
      if (unsubscribe) {  
        unsubscribe();  
      }  
      connectedUnsubscribe();  
      disconnectedUnsubscribe();  
    };  
  }, []); // Empty dependency array since we only want to run this once  

  // Debug current users state  
  useEffect(() => {  
    console.log('Users state updated:', users);  
  }, [users]);  

  return (  
    <div className="container mx-auto p-4">  
      <div className="flex justify-between items-center mb-4">  
        <h2 className="text-2xl font-bold">Users ({users.length})</h2>  
        <div className={`px-3 py-1 rounded-full text-sm ${  
          isConnected   
            ? 'bg-green-100 text-green-800'  
            : 'bg-red-100 text-red-800'  
        }`}>  
          {isConnected ? 'Connected' : 'Disconnected'}  
        </div>  
      </div>  
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">  
        {users.map((user) => (  
          <div  
            key={user.$id}  
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"  
          >  
            <h3 className="font-semibold text-lg">  
              {user.firstName} {user.lastName}  
            </h3>  
            <p className="text-gray-600">{user.email}</p>  
            <div className="mt-2 text-sm text-gray-500">  
              <p>{user.address1}</p>  
              <p>  
                {user.city}, {user.state} {user.postalCode}  
              </p>  
            </div>  
          </div>  
        ))}  
      </div>  
    </div>  
  );  
}