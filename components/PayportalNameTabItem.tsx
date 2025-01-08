"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn, formUrlQuery } from "@/lib/utils";
interface Account {
  id: string;
  appwriteItemId: string;
  name: string;
  officialName: string;
  availableBalance: number;
  currentBalance: number;
  institutionId: string;
  mask: string;
  type: string;
  subtype: string;
  shareableId: string;
}

declare interface BankTabItemProps {
  account: Account;
  appwriteItemId?: string;
}

const PayportalNameTabItem = ({
  account,
  appwriteItemId,
}: BankTabItemProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isActive = appwriteItemId === account?.appwriteItemId;

  const handleBankChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "id",
      value: account?.appwriteItemId,
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      onClick={handleBankChange}
      className={cn(`banktab-item`, {
        " border-blue-600": isActive,
      })}
    >
      <p
        className={cn(`text-16 line-clamp-1 flex-1 font-medium text-gray-500`, {
          " text-blue-600": isActive,
        })}
      >
        {account.name}
      </p>
    </div>
  );
};

export default PayportalNameTabItem;
