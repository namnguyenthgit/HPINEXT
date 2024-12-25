// components/forms/PayPortalTransferForm.tsx
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Image from "next/image";
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
import { createTransaction } from "@/lib/actions/transaction.actions";

const formSchema = z.object({
  payPortalName: z.enum(["Zalopay", "OCB pay", "Galaxy Pay"]),
  lsDocumentNo: z.string().min(1, "Document number is required"),
  amount: z.string().min(1, "Amount is required"),
});

const PAY_PORTALS = [
  { name: "Zalopay", value: "Zalopay" },
  { name: "OCB pay", value: "OCB pay" },
  { name: "Galaxy Pay", value: "Galaxy Pay" },
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
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payPortalName: undefined,
      lsDocumentNo: "",
      amount: "",
    },
  });

  const generateZaloPayRequest = async (data: z.infer<typeof formSchema>) => {
    const response = await fetch("/api/payment/zalopay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        lsDocumentNo: data.lsDocumentNo,
        amount: data.amount,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Payment request failed");
    }

    if (result.return_code !== 1) {
      throw new Error(result.return_message || "Payment generation failed");
    }

    return result.order_url;
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (data.payPortalName === "Zalopay") {
        const orderUrl = await generateZaloPayRequest(data);

        // Create transaction in Appwrite
        const transaction = await createTransaction({
          email,
          payPortalName: data.payPortalName,
          amount: data.amount,
          lsDocumentNo: data.lsDocumentNo,
        });

        if (!transaction) {
          throw new Error("Failed to create transaction");
        }

        // Open payment URL in new tab
        window.open(orderUrl, "_blank");
      }
    } catch (error) {
      console.error("Payment Error:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
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
                  {PAY_PORTALS.map((portal) => (
                    <SelectItem key={portal.value} value={portal.value}>
                      {portal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
                  {DOCUMENT_NUMBERS.map((docNo) => (
                    <SelectItem key={docNo} value={docNo}>
                      {docNo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="p-4 space-y-2 text-sm bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center text-red-700">
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
              <span className="font-medium">Payment Error</span>
            </div>
            <p className="text-red-600 ml-6">{error}</p>
          </div>
        )}

        {/* {qrCode && (
          <div className="flex flex-col items-center gap-4 p-4 border rounded-md">
            <Image
              src={qrCode}
              alt="Payment QR Code"
              width={200}
              height={200}
              className="rounded-md"
            />
            <p className="text-sm text-gray-500">
              Scan this QR code to complete your payment
            </p>
          </div>
        )} */}

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Payment...
            </>
          ) : (
            "Generate Payment"
          )}
        </Button>
      </form>
    </Form>
  );
};

export default PayPortalTransferForm;
