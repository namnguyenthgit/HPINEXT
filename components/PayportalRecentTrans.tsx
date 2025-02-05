import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "./Pagination";
import { PayPortalTrans, tableSelectLimitOption } from "@/types";
import { PayportalTransTable } from "./PayportalTransTable";
import { PayportalTabItem } from "./PayportalTabItem";
import PayPortalInfo from "./PayPortalInfo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface RecentTransactionsProps {
  portals: string[];
  currentPortal: string;
  transactions: PayPortalTrans[];
  page: number;
  onLimitChange: (limit: tableSelectLimitOption) => void;
  currentLimit: tableSelectLimitOption;
}

const PayportalRecentTrans = ({
  portals = [],
  currentPortal,
  transactions = [],
  page = 1,
  onLimitChange,
  currentLimit,
}: RecentTransactionsProps) => {
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Modified to show fixed options regardless of total
  const getLimitOptions = (): {
    value: tableSelectLimitOption;
    label: string;
  }[] => {
    return [
      { value: 50, label: "50 transactions" },
      { value: 100, label: "100 transactions" },
      { value: 200, label: "200 transactions" },
      { value: 500, label: "500 transactions" },
      { value: "all", label: "All transactions" },
    ];
  };

  // First, get the transactions based on the overall limit
  const limitedTransactions = transactions;
  const totalPages = Math.ceil(limitedTransactions.length / rowsPerPage);
  const indexOfLastTransaction = page * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;
  const currentTransactions = limitedTransactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  return (
    <section className="recent-transactions">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="recent-transactions-label">Display recent:</h2>
          <Select
            value={String(currentLimit)}
            onValueChange={(value) => {
              onLimitChange(
                value === "all"
                  ? "all"
                  : (Number(value) as tableSelectLimitOption)
              );
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select limit" />
            </SelectTrigger>
            <SelectContent className="bg-white">
              {getLimitOptions().map((option) => (
                <SelectItem key={option.value} value={String(option.value)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      <Tabs
        value={currentPortal}
        defaultValue={currentPortal}
        className="w-full"
      >
        <TabsList className="recent-transactions-tablist">
          {portals.map((portal: string) => (
            <TabsTrigger key={portal} value={portal}>
              <PayportalTabItem portal={portal} currentPortal={currentPortal} />
            </TabsTrigger>
          ))}
        </TabsList>
        {portals.map((portal: string) => (
          <TabsContent value={portal} key={portal} className="space-y-4">
            <PayPortalInfo
              portal={portal}
              currentPortal={currentPortal}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={setRowsPerPage}
            />
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
