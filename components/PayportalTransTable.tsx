import { removeSpecialCharacters } from "@/lib/utils";
import { PayPortalTrans } from "@/types";

interface TransactionsTableProps {
  transactions: PayPortalTrans[];
}

export function PayportalTransTable({ transactions }: TransactionsTableProps) {
  const formatAmount = (amount: string | null | undefined): string => {
    if (!amount) return "0";
    return new Intl.NumberFormat("vi-VN").format(parseInt(amount));
  };

  const formatStatus = (status: string | null | undefined): string => {
    if (!status) return "";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const rows = transactions.map((transaction) => ({
    id: transaction.$id || "",
    email: transaction.email || "",
    payPortalName: transaction.payPortalName || "",
    channel: transaction.channel || "",
    status: formatStatus(transaction.status),
    amount: formatAmount(transaction.amount),
    documentNo: transaction.lsDocumentNo || "",
    payPortalOrder: removeSpecialCharacters(transaction.payPortalOrder || ""),
    providerTransId: removeSpecialCharacters(
      transaction.callbackProviderTransId || ""
    ),
    paymentTime: transaction.callbackPaymentTime || "",
    errorMessage: transaction.callbackErrorMessage || "",
    createdAt: transaction.$createdAt || "",
  }));

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="border-b bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Email</th>
            <th className="px-3 py-2 text-left font-medium">Portal</th>
            <th className="px-3 py-2 text-left font-medium">Channel</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
            <th className="px-3 py-2 text-left font-medium">Document No</th>
            <th className="px-3 py-2 text-left font-medium">Portal Order</th>
            <th className="px-3 py-2 text-left font-medium">
              Provider Trans ID
            </th>
            <th className="px-3 py-2 text-left font-medium">Payment Time</th>
            <th className="px-3 py-2 text-left font-medium">Error Message</th>
            <th className="px-3 py-2 text-left font-medium">Created At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b">
              <td className="px-3 py-2">{row.email}</td>
              <td className="px-3 py-2">{row.payPortalName}</td>
              <td className="px-3 py-2">{row.channel}</td>
              <td className="px-3 py-2">{row.status}</td>
              <td className="px-3 py-2 text-right">{row.amount}</td>
              <td className="px-3 py-2">{row.documentNo}</td>
              <td className="px-3 py-2">{row.payPortalOrder}</td>
              <td className="px-3 py-2">{row.providerTransId}</td>
              <td className="px-3 py-2">{row.paymentTime}</td>
              <td className="px-3 py-2">{row.errorMessage}</td>
              <td className="px-3 py-2">{row.createdAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
