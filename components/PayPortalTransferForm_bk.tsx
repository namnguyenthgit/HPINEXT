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

const PayPortalTransferForm = ({ email }: PayPortalTransferFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
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
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setStatus({ type: null, message: null });

      if (data.payPortalName === "Zalopay") {
        const response = await fetch("/api/payportal/zalopay", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email, // Add email to the request
            lsDocumentNo: data.lsDocumentNo,
            amount: data.amount,
            payPortalName: data.payPortalName,
          }),
        });

        const result = await response.json();
        if (result.return_code !== 1) {
          // Handle ZaloPay errors
          setStatus({
            type: "error",
            message: `${result.return_message}${
              result.sub_return_message ? `: ${result.sub_return_message}` : ""
            }`,
          });
        } else {
          // Handle success
          setStatus({
            type: "success",
            message:
              "QR Code generated successfully. Please scan to complete payment.",
          });
          // Open payment URL in new tab
          window.open(result.order_url, "_blank");
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
                : "bg-red-50 border-red-200"
            }`}
          >
            <div
              className={`flex items-center ${
                status.type === "success" ? "text-green-700" : "text-red-700"
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
                  : "Generate QR Payment Error:"}
              </span>
            </div>
            <p
              className={`ml-6 ${
                status.type === "success" ? "text-green-600" : "text-red-600"
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