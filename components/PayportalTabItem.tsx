"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn, formUrlQuery } from "@/lib/utils";

interface PayportalTabItemProps {
  portal: string;
  currentPortal: string;
}

export const PayportalTabItem = ({
  portal,
  currentPortal,
}: PayportalTabItemProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      className={cn(`banktab-item`, {
        "border-blue-600": isActive,
      })}
    >
      <p
        className={cn(`text-16 line-clamp-1 flex-1 font-medium text-gray-500`, {
          "text-blue-600": isActive,
        })}
      >
        {portal}
      </p>
    </div>
  );
};
