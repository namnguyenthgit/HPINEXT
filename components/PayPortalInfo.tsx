"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn, formUrlQuery } from "@/lib/utils";

interface PortalInfoProps {
  portal: string;
  currentPortal: string;
  transactionCount: number;
}

const PayPortalInfo = ({
  portal,
  currentPortal,
  transactionCount,
}: PortalInfoProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isActive = currentPortal === portal;

  const handlePortalChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "portal",
      value: portal,
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      onClick={handlePortalChange}
      className={cn("portal-info bg-card rounded-lg p-4", {
        "shadow-sm border-blue-700": isActive,
      })}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{portal}</h3>
        <div className="text-sm text-muted-foreground">
          {transactionCount} transactions
        </div>
      </div>
    </div>
  );
};

export default PayPortalInfo;
