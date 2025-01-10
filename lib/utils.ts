/* eslint-disable no-prototype-builtins */
import { type ClassValue, clsx } from "clsx";
import qs from "query-string";
import { twMerge } from "tailwind-merge";
import { z } from "zod";
import CryptoJS from 'crypto-js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FormattedDateResult {  
  dateTime: string;  
  dateDay: string;  
  date: string;  
  time: string;  
}  

interface DateTimeFormatOptions {  
  dateTime?: Intl.DateTimeFormatOptions;  
  dateDay?: Intl.DateTimeFormatOptions;  
  date?: Intl.DateTimeFormatOptions;  
  time?: Intl.DateTimeFormatOptions;  
}  

const defaultOptions: DateTimeFormatOptions = {  
  dateTime: {  
    weekday: "short",  
    month: "short",  
    day: "numeric",  
    hour: "numeric",  
    minute: "numeric",  
    hour12: true,  
  },  
  dateDay: {  
    weekday: "short",  
    year: "numeric",  
    month: "2-digit",  
    day: "2-digit",  
  },  
  date: {  
    month: "short",  
    year: "numeric",  
    day: "numeric",  
  },  
  time: {  
    hour: "numeric",  
    minute: "numeric",  
    hour12: true,  
  },  
};  

export const formatDateTime = (  
  dateString: Date,  
  locale: string = "en-US",  
  customOptions?: DateTimeFormatOptions  
): FormattedDateResult => {  
  const options = { ...defaultOptions, ...customOptions };  

  try {  
    const formattedDateTime = new Date(dateString).toLocaleString(  
      locale,  
      options.dateTime  
    );  

    const formattedDateDay = new Date(dateString).toLocaleString(  
      locale,  
      options.dateDay  
    );  

    const formattedDate = new Date(dateString).toLocaleString(  
      locale,  
      options.date  
    );  

    const formattedTime = new Date(dateString).toLocaleString(  
      locale,  
      options.time  
    );  

    return {  
      dateTime: formattedDateTime,  
      dateDay: formattedDateDay,  
      date: formattedDate,  
      time: formattedTime,  
    };  
  } catch (error) {  
    console.error(`Error formatting date for locale ${locale}:`, error);  
    // Fallback to en-US if the provided locale fails  
    return formatDateTime(dateString, "en-US", customOptions);  
  }  
};

export function formatAmount(amount: number): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

  return formatter.format(amount);
}

//export const parseStringify = (value: any) => JSON.parse(JSON.stringify(value));
export const parseStringify = (value: unknown) => JSON.parse(JSON.stringify(value));

export const removeSpecialCharacters = (value: string) => {
  return value.replace(/[^\w\s]/gi, "");
};

interface UrlQueryParams {
  params: string;
  key: string;
  value: string;
}

export function formUrlQuery({ params, key, value }: UrlQueryParams) {
  const currentUrl = qs.parse(params);

  currentUrl[key] = value;

  return qs.stringifyUrl(
    {
      url: window.location.pathname,
      query: currentUrl,
    },
    { skipNull: true }
  );
}

export function getAccountTypeColors(type: AccountTypes) {
  switch (type) {
    case "depository":
      return {
        bg: "bg-blue-25",
        lightBg: "bg-blue-100",
        title: "text-blue-900",
        subText: "text-blue-700",
      };

    case "credit":
      return {
        bg: "bg-success-25",
        lightBg: "bg-success-100",
        title: "text-success-900",
        subText: "text-success-700",
      };

    default:
      return {
        bg: "bg-green-25",
        lightBg: "bg-green-100",
        title: "text-green-900",
        subText: "text-green-700",
      };
  }
}

export function countTransactionCategories(
  transactions: Transaction[]
): CategoryCount[] {
  const categoryCounts: { [category: string]: number } = {};
  let totalCount = 0;

  // Iterate over each transaction
  if (transactions) {  
    transactions.forEach((transaction) => {  
      const category = transaction.category;  

      if (categoryCounts.hasOwnProperty(category)) {  
        categoryCounts[category]++;  
      } else {  
        categoryCounts[category] = 1;  
      }  

      totalCount++;  
    });  
  }

  // Convert the categoryCounts object to an array of objects
  const aggregatedCategories: CategoryCount[] = Object.keys(categoryCounts).map(
    (category) => ({
      name: category,
      count: categoryCounts[category],
      totalCount,
    })
  );

  // Sort the aggregatedCategories array by count in descending order
  aggregatedCategories.sort((a, b) => b.count - a.count);

  return aggregatedCategories;
}

export function extractCustomerIdFromUrl(url: string) {
  // Split the URL string by '/'
  const parts = url.split("/");

  // Extract the last part, which represents the customer ID
  const customerId = parts[parts.length - 1];

  return customerId;
}

export function encryptId(id: string) {
  return btoa(id);
}

export function decryptId(id: string) {
  return atob(id);
}

export function encryptHmacSHA256(data:string, key: string){
  return CryptoJS.HmacSHA256(data, key).toString();
}

export function verifyHmacSHA256(originalData: string, key: string, hashToVerify: string) {  
  const generatedHash = encryptHmacSHA256(originalData, key);  
  return generatedHash === hashToVerify;
}  

export const getTransactionStatus = (date: Date) => {
  const today = new Date();
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  return date > twoDaysAgo ? "Processing" : "Success";
};

export const authFormSchema = (type: string) => z.object({
  // sign up
  firstName: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  lastName: type === 'sign-in' ? z.string().optional() : z.string().min(3),
  // both
  email: z.string().email(),
  password: z.string().min(8),
})

export function generateUniqueString(length?: number): string {  
  // Default length is 5 if not provided  
  const requestedLength = length || 5;  
  
  // Validate length  
  if (requestedLength < 1 || requestedLength > 32) {  
      throw new Error('Length must be between 1 and 32 characters');  
  }  

  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';  
  let result = '';  
  
  // Generate random string of requested length  
  for (let i = 0; i < requestedLength; i++) {  
      const randomIndex = Math.floor(Math.random() * characters.length);  
      result += characters.charAt(randomIndex);  
  }  
  
  return result;  
}  