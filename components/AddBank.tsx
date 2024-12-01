"use client";  

import * as React from "react";  
import { zodResolver } from "@hookform/resolvers/zod";  
import { useForm } from "react-hook-form";  
import * as z from "zod";  
import { Button } from "@/components/ui/button";  
import { Input } from "@/components/ui/input";  
import { useState } from "react";  
import { Loader2 } from "lucide-react";  
import { useRouter } from "next/navigation";  
import {  
  Form,  
  FormControl,  
  FormField,  
  FormItem,  
  FormLabel,  
  FormMessage,  
} from "@/components/ui/form";  
import {  
  Command,  
  CommandEmpty,  
  CommandGroup,  
  CommandInput,  
  CommandItem,  
  CommandList,  
} from "@/components/ui/command";  
import {  
  Popover,  
  PopoverContent,  
  PopoverTrigger,  
} from "@/components/ui/popover";  
import { createPrivateBankAccount } from "@/lib/actions/user.actions";  
import { ID } from "appwrite";  
import { useToast } from "@/hooks/use-toast"  

const banks = [  
  { value: "chase", label: "Chase Bank" },  
  { value: "bofa", label: "Bank of America" },  
  { value: "wells_fargo", label: "Wells Fargo" },  
  { value: "citi", label: "Citibank" },  
  { value: "us_bank", label: "US Bank" },  
];  

const formSchema = z.object({  
  privateAccountNumber: z.string().min(8, {  
    message: "Account number must be at least 8 characters.",  
  }),  
  bankCardNumber: z.string().min(16, {  
    message: "Card number must be 16 digits.",  
  }),  
  availableBalance: z.string().min(1, {  
    message: "Available balance is required.",  
  }),  
  currentBalance: z.string().min(1, {  
    message: "Current balance is required.",  
  }),  
  type: z.string().min(1, {  
    message: "Account type is required.",  
  }),  
});  

export function AddBank({ userId }: AddBankProps) {  
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);  
  const [open, setOpen] = useState(false);  
  const [selectedBank, setSelectedBank] = useState<typeof banks[0] | null>(null);  

  const form = useForm<z.infer<typeof formSchema>>({  
    resolver: zodResolver(formSchema),  
    defaultValues: {  
      privateAccountNumber: "",  
      bankCardNumber: "",  
      availableBalance: "",  
      currentBalance: "",  
      type: "checking", // default value  
    },  
  });  

  const onSubmit = async (data: z.infer<typeof formSchema>) => {  
    if (!selectedBank) {  
      toast({  
        variant: "destructive",  
        description: "Please select a bank.",  
      });  
      return;  
    }  

    setIsLoading(true);  
    try {  
      const bankData = {  
        privateBankId: ID.unique(),  
        bankName: selectedBank.label,  
        privateAccountNumber: data.privateAccountNumber,  
        bankCardNumber: data.bankCardNumber,  
        availableBalance: data.availableBalance,  
        currentBalance: data.currentBalance,  
        type: data.type,  
        shareableId: ID.unique(),  
        userId: userId, // Replace this with actual user ID from your auth context  
      };  

      const newBank = await createPrivateBankAccount(bankData);  

      if (newBank) {  
        toast({  
          description: "Bank account added successfully!",  
        });  
        form.reset();  
        setSelectedBank(null);  
        router.push("/");  
      }  
    } catch (error) {  
      toast({  
        variant: "destructive",  
        description: "Failed to add bank account. Please try again.",  
      });  
      console.error(error);  
    }  
    setIsLoading(false);  
  };  

  return (  
    <Form {...form}>  
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">  
        <div className="space-y-2">  
          <FormLabel>Bank Name</FormLabel>  
          <Popover open={open} onOpenChange={setOpen}>  
            <PopoverTrigger asChild>  
              <Button  
                variant="outline"  
                role="combobox"  
                aria-expanded={open}  
                className="w-full justify-between"  
              >  
                {selectedBank ? selectedBank.label : "Select bank..."}  
              </Button>  
            </PopoverTrigger>  
            <PopoverContent className="w-full p-0">  
              <Command>  
                <CommandInput placeholder="Search bank..." />  
                <CommandList>  
                  <CommandEmpty>No bank found.</CommandEmpty>  
                  <CommandGroup>  
                    {banks.map((bank) => (  
                      <CommandItem  
                        key={bank.value}  
                        onSelect={() => {  
                          setSelectedBank(bank);  
                          setOpen(false);  
                        }}  
                      >  
                        {bank.label}  
                      </CommandItem>  
                    ))}  
                  </CommandGroup>  
                </CommandList>  
              </Command>  
            </PopoverContent>  
          </Popover>  
        </div>  

        <FormField  
          control={form.control}  
          name="privateAccountNumber"  
          render={({ field }) => (  
            <FormItem>  
              <FormLabel>Account Number</FormLabel>  
              <FormControl>  
                <Input placeholder="Enter account number" {...field} />  
              </FormControl>  
              <FormMessage />  
            </FormItem>  
          )}  
        />  

        <FormField  
          control={form.control}  
          name="bankCardNumber"  
          render={({ field }) => (  
            <FormItem>  
              <FormLabel>Card Number</FormLabel>  
              <FormControl>  
                <Input placeholder="Enter card number" {...field} />  
              </FormControl>  
              <FormMessage />  
            </FormItem>  
          )}  
        />  

        <FormField  
          control={form.control}  
          name="availableBalance"  
          render={({ field }) => (  
            <FormItem>  
              <FormLabel>Available Balance</FormLabel>  
              <FormControl>  
                <Input placeholder="0.00" type="number" step="0.01" {...field} />  
              </FormControl>  
              <FormMessage />  
            </FormItem>  
          )}  
        />  

        <FormField  
          control={form.control}  
          name="currentBalance"  
          render={({ field }) => (  
            <FormItem>  
              <FormLabel>Current Balance</FormLabel>  
              <FormControl>  
                <Input placeholder="0.00" type="number" step="0.01" {...field} />  
              </FormControl>  
              <FormMessage />  
            </FormItem>  
          )}  
        />  

        <FormField  
          control={form.control}  
          name="type"  
          render={({ field }) => (  
            <FormItem>  
              <FormLabel>Account Type</FormLabel>  
              <FormControl>  
                <select  
                  className="w-full rounded-md border border-input bg-background px-3 py-2"  
                  {...field}  
                >  
                  <option value="checking">Checking</option>  
                  <option value="savings">Savings</option>  
                  <option value="credit">Credit</option>  
                </select>  
              </FormControl>  
              <FormMessage />  
            </FormItem>  
          )}  
        />  

        <Button   
          type="submit"   
          className="w-full"  
          disabled={isLoading}  
        >  
          {isLoading ? (  
            <div className="flex items-center gap-2">  
              <Loader2 className="h-4 w-4 animate-spin" />  
              <span>Adding Bank...</span>  
            </div>  
          ) : (  
            "Add Bank"  
          )}  
        </Button>  
      </form>  
    </Form>  
  );  
}