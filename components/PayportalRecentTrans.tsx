import Link from "next/link";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TransactionsTable from "./TransactionsTable";
import { Pagination } from "./Pagination";
import { PayPortalTrans } from "@/types";
import { PayportalTransTable } from "./PayportalTransTable";

interface RecentTransactionsProps {
  portals: string[];
  currentPortal: string;
  transactions: PayPortalTrans[];
  page: number;
}

const PayportalRecentTrans = ({
  portals = [],
  currentPortal,
  transactions = [],
  page = 1,
}: RecentTransactionsProps) => {
  const rowsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / rowsPerPage);
  const indexOfLastTransaction = page * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactions = transactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  return (
    <section className="recent-transactions">
      <header className="flex items-center justify-between">
        <h2 className="recent-transactions-label">Recent Transactions</h2>
        <Link
          href={`/transaction-history/?portal=${currentPortal}`}
          className="view-all-btn"
        >
          View all
        </Link>
      </header>
      <Tabs defaultValue={currentPortal} className="w-full">
        <TabsList className="recent-transactions-tablist">
          {portals.map((portal: string) => (
            <TabsTrigger key={portal} value={portal}>
              <div className="flex items-center space-x-2">
                <span>{portal}</span>
              </div>
            </TabsTrigger>
          ))}
        </TabsList>
        {portals.map((portal: string) => (
          <TabsContent value={portal} key={portal} className="space-y-4">
            <div className="bg-card rounded-lg p-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{portal}</h3>
                <div className="text-sm text-muted-foreground">
                  {transactions.length} transactions
                </div>
              </div>
            </div>
            {/* <TransactionsTable transactions={currentTransactions} /> */}
            <PayportalTransTable transactions={currentTransactions} />
            {totalPages > 1 && (
              <div className="my-4 w-full">
                <Pagination totalPages={totalPages} page={page} />
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
};

export default PayportalRecentTrans;
