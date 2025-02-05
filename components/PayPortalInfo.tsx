"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { cn, formUrlQuery } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface PortalInfoProps {
  portal: string;
  currentPortal: string;
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
}

const PayPortalInfo = ({
  portal,
  currentPortal,
  rowsPerPage,
  onRowsPerPageChange,
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-gray-500">Rows/Page:</span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => onRowsPerPageChange(Number(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder="Select rows" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                {[10, 20, 30, 50].map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayPortalInfo;
