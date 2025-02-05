"use client";

import PayPortalTransferForm from "@/components/PayPortalTransferForm";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { useEffect, useState } from "react";
import PayportalRecentTrans from "@/components/PayportalRecentTrans";
import {
  MONITORED_FIELDS,
  subcribePayportalTrans,
} from "@/lib/client/appwriteUserPPTransSub";
import { getPayPortalTransByStores } from "@/lib/actions/payportaltrans.actions";
import { PayPortalTrans, tableSelectLimitOption, User } from "@/types";

interface ExtendedUser extends User {
  storeNo: string;
  storeList?: string | string[];
}

interface PaymentPayportalProps {
  searchParams: {
    page?: string | string[];
    portal?: string | string[];
  };
}

type LimitOption = 50 | 100 | 200 | 500 | "all";

const PaymentPayportal = ({ searchParams }: PaymentPayportalProps) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<PayPortalTrans[]>([]);
  const [transactionLimit, setTransactionLimit] = useState<LimitOption>(50);

  const pageParam = searchParams?.page;
  const currentPage =
    Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1;

  const portalParam = searchParams?.portal;
  const currentPortal =
    (Array.isArray(portalParam) ? portalParam[0] : portalParam) || "zalopay";

  // Helper function to convert comma-separated string to array
  const getStoreArray = (user: ExtendedUser): string[] => {
    if (!user.storeList && !user.storeNo) return [];

    const storeNoArray = user.storeNo.split(",").map((store) => store.trim());

    if (!user.storeList) return storeNoArray;

    let storeListArray: string[] = [];

    if (typeof user.storeList === "string") {
      storeListArray = user.storeList.split(",").map((store) => store.trim());
    } else if (Array.isArray(user.storeList)) {
      storeListArray = user.storeList.reduce((acc: string[], store) => {
        if (typeof store === "string") {
          return [...acc, ...store.split(",").map((s) => s.trim())];
        }
        return acc;
      }, []);
    }

    const combinedArray = [...storeNoArray, ...storeListArray];
    return Array.from(new Set(combinedArray));
  };
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setup = async () => {
      try {
        const initialUser = await getLoggedInUser();
        if (!initialUser) {
          console.error("No user found");
          return;
        }

        setUser(initialUser);
        const storeArray = getStoreArray(initialUser);
        await loadTransactions(storeArray, transactionLimit);

        unsubscribe = subcribePayportalTrans(
          initialUser.$id,
          storeArray,
          MONITORED_FIELDS,
          {
            onUserChange: (updatedUser) => {
              setUser(updatedUser as ExtendedUser);
              const newStoreArray = getStoreArray(updatedUser as ExtendedUser);
              loadTransactions(newStoreArray, transactionLimit);
            },
            onTransactionChange: (updatedTransaction, changedFields) => {
              setTransactions((prev) => {
                // Handle deleted transaction
                if (changedFields === "deleted") {
                  return prev.filter((t) => t.$id !== updatedTransaction.$id);
                }

                // Handle new transaction
                if (changedFields === "created") {
                  return [updatedTransaction, ...prev].slice(
                    0,
                    transactionLimit === "all" ? undefined : transactionLimit
                  );
                }

                // Handle updated transaction
                if (Array.isArray(changedFields)) {
                  return prev.map((t) =>
                    t.$id === updatedTransaction.$id
                      ? { ...t, ...updatedTransaction }
                      : t
                  );
                }

                return prev;
              });

              // Enhanced logging for debugging
              // if (changedFields === 'created') {
              //   console.log('New transaction created:', updatedTransaction);
              // } else if (changedFields === 'deleted') {
              //   console.log('Transaction deleted:', updatedTransaction);
              // } else if (Array.isArray(changedFields)) {
              //   console.log('Transaction updated:', {
              //     id: updatedTransaction.$id,
              //     changedFields,
              //     newValues: changedFields.map(field => ({
              //       field,
              //       value: updatedTransaction[field]
              //     }))
              //   });
              // }
            },
          }
        );
      } catch (error) {
        console.error("Setup error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    setup();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [transactionLimit]);

  const loadTransactions = async (
    storeArray: string[],
    limit: LimitOption = 50
  ): Promise<void> => {
    try {
      const response = await getPayPortalTransByStores(
        storeArray,
        limit === "all" ? undefined : limit
      );
      console.log(
        "PaymentPayportal-loadTransactions-getPayPortalTransByStores response:",
        response
      );
      if (response && Array.isArray(response.documents)) {
        setTransactions(response.documents);
      }
    } catch (error: unknown) {
      console.error("Error loading transactions:", error);
    }
  };

  // Group transactions by payPortalName
  const groupedTransactions = transactions.reduce((acc, transaction) => {
    const portal = transaction.payPortalName;
    if (!acc[portal]) {
      acc[portal] = [];
    }
    acc[portal].push(transaction);
    return acc;
  }, {} as Record<string, PayPortalTrans[]>);

  const handleLimitChange = async (newLimit: tableSelectLimitOption) => {
    setIsLoading(true); // Set loading state
    if (user) {
      const storeArray = getStoreArray(user);
      await loadTransactions(storeArray, newLimit);
      setTransactionLimit(newLimit);
    }
    setIsLoading(false); // Clear loading state
  };

  const portalNames = [...new Set(transactions.map((t) => t.payPortalName))];
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
          onLimitChange={handleLimitChange}
          currentLimit={transactionLimit}
        />
      </section>
    </>
  );
};

export default PaymentPayportal;
