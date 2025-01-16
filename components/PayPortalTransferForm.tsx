"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Search } from "lucide-react";

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
import { ZaloPayResponse } from "@/lib/zalo/zalo.config";
import {
  getLSRetailDocuments,
  getLSRetailTransactionLines,
} from "@/lib/actions/lsretail.action";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";

const formSchema = z.object({
  payPortalName: z.enum(["zalopay", "vnpay", "ocbpay", "galaxypay"]),
  lsDocumentNo: z.string().min(1, "Document number is required"),
  amount: z.string().min(1, "Amount is required"),
});

const PAY_PORTALS = [
  // { name: "VNPay", value: "VNPay" },
  { name: "Zalopay", value: "zalopay" },
  // { name: "OCB pay", value: "OCB pay" },
  // { name: "Galaxy Pay", value: "Galaxy Pay" },
];

interface PayPortalTransferFormProps {
  email: string;
  storeNo: string;
}

interface ZaloPaySuccessResponse extends ZaloPayResponse {
  order_url?: string;
  zp_trans_token?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Highlighted text component
const HighlightedText = ({
  text,
  highlight,
}: {
  text: string;
  highlight: string;
}) => {
  if (!highlight.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${highlight})`, "gi"));

  return (
    <>
      {parts.map((part: string, i: number) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <span key={i} className="bg-yellow-100 font-medium">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const PayPortalTransferForm = ({
  email,
  storeNo,
}: PayPortalTransferFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "warning" | null;
    message: string | null;
  }>({ type: null, message: null });
  const ITEM_HEIGHT = 36; // Height of each item in pixels  
  const VISIBLE_ITEMS = 4; // Number of items to show before scrolling  
  const PADDING = 8;
  const [documentNumbers, setDocumentNumbers] = useState<string[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showManualRedirect, setShowManualRedirect] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState("");


  const debouncedSearchQuery = useDebounce(searchQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      payPortalName: undefined,
      lsDocumentNo: "",
      amount: "",
    },
  });

  const fetchDocuments = useCallback(async () => {
    if (!storeNo) return;

    try {
      setIsLoadingDocuments(true);
      setDocumentError(null);
      const response = await getLSRetailDocuments(storeNo);

      // Type guard to ensure response has the correct shape
      if (
        !response.success ||
        !response.data ||
        !Array.isArray(response.data.Receipt_no)
      ) {
        throw new Error(response.message || "Failed to fetch documents");
      }

      setDocumentNumbers(response.data.Receipt_no);
    } catch (error) {
      setDocumentError(
        error instanceof Error
          ? error.message
          : "Failed to load document numbers"
      );
      // Initialize empty array on error to prevent undefined
      setDocumentNumbers([]);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [storeNo]);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return documentNumbers;

    return documentNumbers.filter((docNo: string) =>
      docNo.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [documentNumbers, debouncedSearchQuery]);

  const handleSelectOpen = useCallback(
    (open: boolean) => {
      // Don't close if input is focused
      if (!open && isInputFocused) {
        return;
      }

      setIsSelectOpen(open);
      if (open) {
        void fetchDocuments();
      }
    },
    [fetchDocuments, isInputFocused]
  );

  // For external URLs, use window.open instead of router.push
  const handlePaymentRedirect = (url: string) => {
    try {
      setPaymentUrl(url); // Store URL for manual redirect
      const newWindow = window.open(url, "_blank");

      if (
        !newWindow ||
        newWindow.closed ||
        typeof newWindow.closed === "undefined"
      ) {
        setShowManualRedirect(true); // Show manual redirect button
        setStatus({
          type: "warning",
          message:
            "Popup blocked. Please use the manual redirect button below.",
        });
      }
    } catch (error) {
      console.error("Failed to open payment page:", error);
      setShowManualRedirect(true);
      setStatus({
        type: "warning",
        message:
          "Unable to open payment page automatically. Please use manual redirect.",
      });
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      setStatus({ type: null, message: null });
      setShowManualRedirect(false);
      setPaymentUrl("");

      const lsTransactionLineRespond = await getLSRetailTransactionLines(
        data.lsDocumentNo
      );

      //console.log("Response received:", lsTransactionLineRespond);

      if (
        !lsTransactionLineRespond.success ||
        !lsTransactionLineRespond.data ||
        !Array.isArray(lsTransactionLineRespond.data) ||
        lsTransactionLineRespond.data.length === 0
      ) {
        throw new Error("Failed to fetch transaction details");
      }

      const terminalId = lsTransactionLineRespond.data[0]?.Store_no || "";
      const terminalName = lsTransactionLineRespond.data[0]?.Store_name || "";
      const branchName = terminalName.substring(0, 3) || "";
      const columninfo = {
        columninfo: {
          branch_id: branchName,
          store_id: terminalId,
          store_name: terminalName,
        },
      };

      if (!terminalId) {
        console.warn("Terminal ID not found in transaction details");
      }

      const result = await processPayment({
        email,
        lsDocumentNo: data.lsDocumentNo,
        amount: data.amount,
        payPortalName: data.payPortalName,
        channel: "hpinext",
        terminalId: terminalId,
        embed_data: JSON.stringify(columninfo),
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
          message: `${result.return_message}${
            result.sub_return_message
              ? `: ${result.sub_return_message}`
              : "QR Code generated successfully. Please scan to complete payment."
          }`,
        });

        const payPortalResult = result as ZaloPaySuccessResponse;

        // Open payment URL in new tab if it exists in the response
        if (payPortalResult.order_url) {
          handlePaymentRedirect(payPortalResult.order_url);
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
                onValueChange={(value) => {  
                  field.onChange(value);  
                  setIsSelectOpen(false);  
                  setSearchQuery(''); // Reset search after selection  
                }}
                value={field.value}
                open={isSelectOpen}
                onOpenChange={handleSelectOpen}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document number" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent 
                  className="min-w-[300px]"
                  position="popper"
                  sideOffset={5}
                >
                  <div className="bg-white rounded-md shadow-sm">
                    {/* Search Input */}
                    <div className="sticky top-0 p-2 bg-white border-b z-10 rounded-t-md">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          ref={inputRef}
                          placeholder="Search documents..."
                          value={searchQuery}
                          onChange={(e) => {  
                            e.stopPropagation();  
                            setSearchQuery(e.target.value);  
                          }}
                          onKeyDown={(e) => {  
                            e.stopPropagation(); 
                            if (e.key === 'Enter' && filteredDocuments.length === 1) {  
                              field.onChange(filteredDocuments[0]);  
                              setIsSelectOpen(false);  
                              setSearchQuery('');  
                            }  
                          }}
                          onFocus={(e) => {  
                            e.stopPropagation();  
                            setIsInputFocused(true);  
                          }}
                          onBlur={(e) => {  
                            e.stopPropagation();
                            const currentInput = inputRef.current;

                            // Create cleanup function  
                            const timeoutId = setTimeout(() => {  
                              // Safety check if component is still mounted and input exists  
                              if (currentInput && document.body.contains(currentInput)) {  
                                const activeElement = document.activeElement;  
                                if (activeElement && !currentInput.contains(activeElement)) {  
                                  setIsInputFocused(false);  
                                }  
                              }  
                            }, 100);

                            // Cleanup timeout on next blur or unmount  
                            return () => clearTimeout(timeoutId);
                          }}
                          className="pl-8 h-9 w-full bg-transparent"
                        />
                      </div>
                    </div>

                    {/* Results Area */}
                    <ScrollArea
                      className="overflow-auto rounded-b-md"
                      style={{  
                        height: `${(ITEM_HEIGHT * VISIBLE_ITEMS) + (PADDING * 2)}px`,  
                        maxHeight: `${(ITEM_HEIGHT * VISIBLE_ITEMS) + (PADDING * 2)}px`  
                      }}
                      onWheelCapture={(e) => e.stopPropagation()}
                    >
                      {isLoadingDocuments ? (
                        <div className="flex items-center justify-center p-4 space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading documents...</span>
                        </div>
                      ) : documentError ? (
                        <div className="p-4 text-sm text-red-500 text-center">
                          {documentError}
                        </div>
                      ) : filteredDocuments.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">
                          {documentNumbers.length === 0
                            ? "No documents available"
                            : "No matching documents found"}
                        </div>
                      ) : (
                        filteredDocuments.map((docNo) => (
                          <SelectItem 
                            key={docNo}  
                            value={docNo}  
                            className="cursor-pointer hover:bg-gray-100 rounded-sm"  
                            onMouseDown={(e) => {  
                              e.preventDefault();  
                              e.stopPropagation();  
                              field.onChange(docNo);  
                              setIsSelectOpen(false);  
                              setSearchQuery('');
                            }}
                          >
                            <HighlightedText
                              text={docNo}
                              highlight={searchQuery}
                            />
                          </SelectItem>
                        ))
                      )}
                    </ScrollArea>
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

        {showManualRedirect && paymentUrl && (
          <div className="mt-4 p-4 border rounded-md bg-yellow-50">
            <p className="text-sm text-yellow-700 mb-2">
              If the payment page did not open automatically, please click the
              button below:
            </p>
            <Button
              onClick={() => window.open(paymentUrl, "_blank")}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
            >
              Open Payment Page
            </Button>
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
