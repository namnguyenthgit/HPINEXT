import { Client } from 'appwrite';
import { useEffect, useState } from 'react';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

export function useAccountSubscription(
  appwriteItemId: string,
  initialTransactions: Transaction[]
) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //console.log("Realtime event: start");
  useEffect(() => {
    setTransactions(initialTransactions);

    const unsubscribe = client.subscribe(
      [`databases.${process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID}.collections.transactions.documents`],
      (response) => {
        try {
          setIsLoading(true);
          //console.log("Realtime event:", response);
          const { events, payload } = response;
          const transactionPayload = payload as Transaction;

          if (events.includes('databases.*.collections.*.documents.*.create')) {
            if (
              transactionPayload.senderBankId === appwriteItemId ||
              transactionPayload.receiverBankId === appwriteItemId
            ) {
              setTransactions((prev) =>
                [
                  {
                    ...transactionPayload,
                    id: transactionPayload.$id,
                    date: transactionPayload.$createdAt,
                    type: transactionPayload.senderBankId === appwriteItemId ? 'debit' : 'credit',
                    paymentChannel: transactionPayload.channel || '',
                  },
                  ...prev,
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              );
            }
          }

          if (events.includes('databases.*.collections.*.documents.*.update')) {
            setTransactions((prev) =>
              prev.map((t) =>
                t.$id === transactionPayload.$id
                  ? {
                      ...transactionPayload,
                      id: transactionPayload.$id,
                      date: transactionPayload.$createdAt,
                      type: transactionPayload.senderBankId === appwriteItemId ? 'debit' : 'credit',
                      paymentChannel: transactionPayload.channel || '',
                    }
                  : t
              )
            );
          }

          if (events.includes('databases.*.collections.*.documents.*.delete')) {
            setTransactions((prev) => prev.filter((t) => t.$id !== transactionPayload.$id));
          }
        } catch (err) {
          console.error("Subscription processing error:", err);
          setError("Failed to process subscription event.");
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [appwriteItemId, initialTransactions]);

  return {
    accountData: { transactions },
    isLoading,
    error,
  };
}
