// components/forms/PayPortalTransferForm.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { processPayment } from "@/lib/actions/payportal.actions";
import { ZaloPayResponse } from "@/lib/zalo.config";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  payPortalName: z.enum(["Zalopay", "OCB pay", "Galaxy Pay"]),
  lsDocumentNo: z.string().min(1, "Document number is required"),
  amount: z.string().min(1, "Amount is required"),
});

const PAY_PORTALS = [
  // { name: "VNPay", value: "VNPay" },
  { name: "Zalopay", value: "Zalopay" },
  // { name: "OCB pay", value: "OCB pay" },
  // { name: "Galaxy Pay", value: "Galaxy Pay" },
];

// Mock document numbers - replace with actual data
const DOCUMENT_NUMBERS = [
  "000000P015000047084",
  "000000P015000047085",
  "000000P015000047086",
];

interface PayPortalTransferFormProps {
  email: string;
}

interface ZaloPaySuccessResponse extends ZaloPayResponse {
  order_url?: string;
  zp_trans_token?: string;
}

const PayPortalTransferForm = ({ email }: PayPortalTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "warning" | null;
    message: string | null;
  }>({ type: null, message: null });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payPortalName: undefined,
      lsDocumentNo: "",
      amount: "",
    },
  });

  const handlePaymentRedirect = (url: string) => {
    // Method 1: Try window.open first
    const newWindow = window.open(url, "_blank");

    // If popup was blocked or failed
    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed === "undefined"
    ) {
      // Method 2: Create and click a temporary link
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Method 3: If all else fails, redirect in same window
      setTimeout(() => {
        window.location.href = url;
      }, 1000);
    }
  };
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setStatus({ type: null, message: null });
      const result = await processPayment({
        email,
        lsDocumentNo: data.lsDocumentNo,
        amount: data.amount,
        payPortalName: data.payPortalName,
      });

      if (result.return_code !== 1) {
        setStatus({
          type: result.return_code === 2 ? "error" : "warning",
          message: `${result.return_message}${
            result.sub_return_message ? `: ${result.sub_return_message}` : ""
          }`,
        });
      } else {
        setStatus({
          type: "success",
          message:
            "QR Code generated successfully. Please scan to complete payment.",
        });

        const zaloPayResult = result as ZaloPaySuccessResponse;

        // Open payment URL in new tab if it exists in the response
        if (zaloPayResult.order_url) {
          handlePaymentRedirect(zaloPayResult.order_url);
        }
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="payPortalName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Portal</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment portal" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <div className="bg-white">
                    {PAY_PORTALS.map((portal) => (
                      <SelectItem key={portal.value} value={portal.value}>
                        {portal.name}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lsDocumentNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Number</FormLabel>
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document number" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <div className="bg-white">
                    {DOCUMENT_NUMBERS.map((docNo) => (
                      <SelectItem key={docNo} value={docNo}>
                        {docNo}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (VND)</FormLabel>
              <FormControl>
                <input
                  type="number"
                  disabled={isLoading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...field}
                />
              </FormControl>
              <FormMessage className="text-red-500" />
            </FormItem>
          )}
        />

        {status.type && (
          <div
            className={`p-4 space-y-2 text-sm rounded-md border ${
              status.type === "success"
                ? "bg-green-50 border-green-200"
                : status.type === "warning"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center ${
                status.type === "success"
                  ? "text-green-700"
                  : status.type === "warning"
                  ? "text-yellow-700"
                  : "text-red-700"
              }`}
            >
              {status.type === "success" ? (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : status.type === "warning" ? (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="font-medium">
                {status.type === "success"
                  ? "Success"
                  : status.type === "warning"
                  ? "Notice"
                  : "Generate QR Payment Error:"}
              </span>
            </div>
            <p
              className={`ml-6 ${
                status.type === "success"
                  ? "text-green-600"
                  : status.type === "warning"
                  ? "text-yellow-600"
                  : "text-red-600"
              }`}
            >
              {status.message}
            </p>
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading}
          className="payment-transfer_btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating QR Payment...
            </>
          ) : (
            "Generate QR Payment"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PayPortalTransferForm;
