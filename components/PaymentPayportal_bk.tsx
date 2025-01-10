// components/PaymentPayportal.tsx
"use client";

import HeaderBox from "@/components/HeaderBox";
import PayPortalTransferForm from "@/components/PayPortalTransferForm";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { useEffect, useState } from "react";
import PayportalRecentTrans from "@/components/PayportalRecentTrans";
import { subscribeToUsers, User } from "@/lib/client/appwriteUserSubscriptions";
import { subscribeToPayportalTrans } from "@/lib/client/appwritePayPortalTransSubcriptions";
import { getPayPortalTransByStores } from "@/lib/actions/payportaltrans.actions";
import { PayPortalTrans } from "@/types";

interface ExtendedUser extends User {
  storeNo: string;
  storeList?: string | string[]; // comma-separated string of stores
}

interface PaymentPayportalProps {
  searchParams: {
    page?: string | string[];
    portal?: string | string[];
  };
}

const PaymentPayportal = ({ searchParams }: PaymentPayportalProps) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<PayPortalTrans[]>([]);

  const pageParam = searchParams?.page;
  const currentPage =
    Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1;

  const portalParam = searchParams?.portal;
  const currentPortal =
    (Array.isArray(portalParam) ? portalParam[0] : portalParam) || "zalopay";

  // Helper function to convert comma-separated string to array
  // Helper function to convert comma-separated string to array  
  const getStoreArray = (user: ExtendedUser): string[] => {  
    if (!user.storeList && !user.storeNo) return [];  
  
    // Handle storeNo first  
    const storeNoArray = user.storeNo.split(',').map(store => store.trim());  
  
    // If no storeList, return storeNo array  
    if (!user.storeList) return storeNoArray;  
  
    // Handle storeList  
    let storeListArray: string[] = [];  
    
    if (typeof user.storeList === 'string') {  
      // If storeList is a string, split it  
      storeListArray = user.storeList.split(',').map(store => store.trim());  
    } else if (Array.isArray(user.storeList)) {  
      // If storeList is an array, process each element  
      storeListArray = user.storeList.reduce((acc: string[], store) => {  
        if (typeof store === 'string') {  
          return [...acc, ...store.split(',').map(s => s.trim())];  
        }  
        return acc;  
      }, []);  
    }  
  
    // Combine arrays and remove duplicates  
    const combinedArray = [...storeNoArray, ...storeListArray];  
    return Array.from(new Set(combinedArray));  
  };  

  // Function to load transactions
  const loadTransactions = async (storeArray: string[]): Promise<void> => {
    // console.log("Input storeArray:", storeArray);
    // console.log("Type of storeArray:", typeof storeArray);
    // console.log("Is Array?", Array.isArray(storeArray));
    // console.log("First element:", storeArray[0]);
    // console.log("Type of first element:", typeof storeArray[0]);

    try {
      const response = await getPayPortalTransByStores(storeArray);
      if (response && Array.isArray(response.documents)) {
        //console.log("Loaded transactions:", response.documents);
        setTransactions(response.documents);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error loading transactions:", error.message);
      } else {
        console.error("Unknown error loading transactions:", error);
      }
    }
  };

  useEffect(() => {
    let userUnsubscribe: (() => void) | undefined;
    let transUnsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        // Get initial user data
        const initialUser = await getLoggedInUser();
        if (!initialUser) {
          console.error("No user found");
          return;
        }

        // console.log("Initial user data:", {
        //   storeNo: initialUser.storeNo,
        //   storeList: initialUser.storeList,
        //   type: typeof initialUser.storeList,
        // });

        setUser(initialUser);

        // Get store array and load initial transactions
        const storeArray = getStoreArray(initialUser);
        //console.log("Store array:", storeArray);
        await loadTransactions(storeArray);

        // Set up user subscription
        userUnsubscribe = subscribeToUsers(
          () => {}, // onCreate
          (updatedUser) => {
            if (updatedUser.$id === initialUser.$id) {
              // console.log("User updated:", updatedUser);
              setUser(updatedUser as ExtendedUser);

              // Reload transactions when user updates
              const newStoreArray = getStoreArray(updatedUser as ExtendedUser);
              loadTransactions(newStoreArray);
            }
          },
          () => {} // onDelete
        );

        // Set up transaction subscription
        transUnsubscribe = subscribeToPayportalTrans(
          (newTransaction) => {
            //console.log("New transaction:", newTransaction);
            if (storeArray.includes(newTransaction.terminalId)) {
              setTransactions((prev) => [newTransaction, ...prev]);
            }
          },
          (updatedTransaction) => {
            if (storeArray.includes(updatedTransaction.terminalId)) {
              setTransactions((prev) =>
                prev.map((t) =>
                  t.$id === updatedTransaction.$id ? updatedTransaction : t
                )
              );
            }
          },
          (deletedTransactionId) => {
            //console.log("Deleted transaction:", deletedTransactionId);
            setTransactions((prev) =>
              prev.filter((t) => t.$id !== deletedTransactionId)
            );
          }
        );
      } catch (error) {
        if (error instanceof Error) {
          console.error("Setup error:", error.message);
        } else {
          console.error("Unknown setup error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      if (userUnsubscribe) userUnsubscribe();
      if (transUnsubscribe) transUnsubscribe();
    };
  }, []); // Empty dependency array for initial setup

  // Group transactions by payPortalName
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const portal = transaction.payPortalName;
    if (!acc[portal]) {
      acc[portal] = [];
    }
    acc[portal].push(transaction);
    return acc;
  }, {} as Record<string, PayPortalTrans[]>);

  // Get unique portal names for tabs
  const portalNames = [...new Set(transactions.map((t) => t.payPortalName))];

  // Get current portal's transactions
  const currentTransactions = groupedTransactions[currentPortal] || [];

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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error loading user data</div>
      </div>
    );
  }

  return (
    <>
      <section className="size-full pt-5 space-y-5">
        <PayPortalTransferForm email={user.email} storeNo={user.storeNo} />

        <PayportalRecentTrans
          portals={portalNames}
          currentPortal={currentPortal}
          transactions={currentTransactions}
          page={currentPage}
        />
      </section>
    </>
  );
};

export default PaymentPayportal;
