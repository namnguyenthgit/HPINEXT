"use client";  

import HeaderBox from "@/components/HeaderBox";  
import PayPortalTransferForm from "@/components/PayPortalTransferForm";  
import { getLoggedInUser } from "@/lib/actions/user.actions";  
import { useEffect, useState } from "react";  
import { subscribeToUsers, User } from '@/lib/client/userSubscriptions';  

// Extend the User type to include storeNo  
interface ExtendedUser extends User {  
  storeNo: string;  
}  

const Transfer = () => {  
  const [loggedInUser, setLoggedInUser] = useState<ExtendedUser | null>(null);  
  const [isLoading, setIsLoading] = useState(true);  

  useEffect(() => {  
    let unsubscribe: (() => void) | undefined;  

    const setupUserSubscription = async () => {  
      try {  
        // Get initial user data  
        const initialUser = await getLoggedInUser();  
        setLoggedInUser(initialUser as ExtendedUser);  
        
        if (initialUser?.$id) {  
          // Set up user subscription  
          unsubscribe = subscribeToUsers(  
            // onCreate handler (not needed for this case but required by the function)  
            (user) => {  
              console.log('New user created:', user);  
            },  
            // onUpdate handler  
            (updatedUser) => {  
              // Only update if it's our user  
              if (updatedUser.$id === initialUser.$id) {  
                console.log('Current user updated:', updatedUser);  
                setLoggedInUser(updatedUser as ExtendedUser);  
              }  
            },  
            // onDelete handler (not needed for this case but required by the function)  
            (userId) => {  
              console.log('User deleted:', userId);  
            }  
          );  
        }  
      } catch (error) {  
        console.error("Error setting up user subscription:", error);  
      } finally {  
        setIsLoading(false);  
      }  
    };  

    setupUserSubscription();  

    return () => {  
      if (unsubscribe) {  
        unsubscribe();  
      }  
    };  
  }, []);  

  if (isLoading) {  
    return (  
      <div className="flex items-center justify-center min-h-screen">  
        <div className="flex items-center space-x-2">  
          <div className="w-4 h-4 border-t-2 border-b-2 border-current border-solid rounded-full animate-spin"></div>  
          <span>Loading...</span>  
        </div>  
      </div>  
    );  
  }  

  if (!loggedInUser) {  
    return (  
      <div className="flex items-center justify-center min-h-screen">  
        <div className="text-red-500">Error loading user data</div>  
      </div>  
    );  
  }  

  return (  
    <section className="payment-transfer">  
      <HeaderBox  
        title="Pay Portals"  
        subtext="Please provide any specific details or notes related to the payment portals"  
      />  

      <section className="size-full pt-5">  
        <PayPortalTransferForm   
          email={loggedInUser.email}   
          storeNo={loggedInUser.storeNo}   
        />  
      </section>  
    </section>  
  );  
};  

export default Transfer;