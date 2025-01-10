import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDateTime, removeSpecialCharacters } from "@/lib/utils";
import { PayPortalTrans } from "@/types";
import { transactionCategoryStyles } from "@/constants";
import Link from "next/link";
import { RawCopy } from "./rawCopy";

interface TransactionsTableProps {
  transactions: PayPortalTrans[];
}

declare interface CategoryBadgeProps {
  category: string;
}

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const { borderColor, backgroundColor, textColor, chipBackgroundColor } =
    transactionCategoryStyles[
      category as keyof typeof transactionCategoryStyles
    ] || transactionCategoryStyles.default;

  return (
    <div className={cn("category-badge", borderColor, chipBackgroundColor)}>
      <div className={cn("size-2 rounded-full", backgroundColor)} />
      <p className={cn("text-[12px] font-medium", textColor)}>{category}</p>
    </div>
  );
};
export function PayportalTransTable({ transactions }: TransactionsTableProps) {
  const formatAmountValue = (amount: string | null | undefined): string => {
    if (!amount) return "0";
    return new Intl.NumberFormat("vi-VN").format(parseInt(amount));
  };

  return (
    <Table>
      <TableHeader className="bg-[#f9fafb]">
        <TableRow>
          <TableHead className="px-2 w-14 text-center border-r-2">#</TableHead>
          <TableHead className="px-2 max-md:hidden">Store</TableHead>
          <TableHead className="px-2">Document No</TableHead>
          <TableHead className="px-2">Channel</TableHead>
          <TableHead className="px-2">Portal Order</TableHead>
          <TableHead className="px-2">Payment Portal URL</TableHead>
          <TableHead className="px-2">Amount</TableHead>
          <TableHead className="px-2">Status</TableHead>
          <TableHead className="px-2 max-md:hidden">Payment Time</TableHead>
          <TableHead className="px-2 max-md:hidden">Created At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction, index) => (
          <TableRow
            key={transaction.$id}
            className={cn(
              "transition-colors border-b",
              transaction.status === "success"
                ? "bg-emerald-50 hover:bg-emerald-100"
                : transaction.status === "pending"
                ? "bg-yellow-50 hover:bg-yellow-100"
                : transaction.status === "failed"
                ? "bg-red-50 hover:bg-red-100"
                : "bg-gray-50 hover:bg-gray-100"
            )}
          >
            <TableCell className="px-2 text-center text-sm text-gray-500 font-medium border-r-2">
              {index + 1}
            </TableCell>
            <TableCell className="px-2">
              <div className="max-w-[200px]">{transaction.terminalId}</div>
            </TableCell>
            <TableCell className="px-2">{transaction.lsDocumentNo}</TableCell>
            <TableCell className="px-2">{transaction.channel}</TableCell>
            <TableCell className="px-2">
              <RawCopy
                value={transaction.payPortalOrder}
                title="Portal Order"
              />
            </TableCell>
            <TableCell className="px-2">
              <Link
                href={transaction.payPortalPaymentUrl}
                target="_blank"
                className="cursor-pointer"
              >
                <h1 className="text-blue-600 hover:underline">Link</h1>
              </Link>
            </TableCell>
            <TableCell
              className={cn(
                "pl-3 pr-10 font-semibold",
                transaction.status === "success"
                  ? "text-[#039855]"
                  : transaction.status === "failed"
                  ? "text-[#f04438]"
                  : "text-gray-600"
              )}
            >
              {formatAmountValue(transaction.amount)}
            </TableCell>
            <TableCell className="px-2">
              <CategoryBadge category={transaction.status} />
            </TableCell>
            <TableCell className="px-2 max-md:hidden">
              {transaction.callbackPaymentTime &&
                formatDateTime(new Date(transaction.callbackPaymentTime))
                  .dateTime}
            </TableCell>
            <TableCell className="px-2 max-md:hidden">
              {transaction.$createdAt &&
                formatDateTime(new Date(transaction.$createdAt), "vi-VN")
                  .dateTime}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
