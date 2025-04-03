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

export interface StringGeneratorOptions {  
  length?: number;  
  includeLowercase?: boolean;  
  includeUppercase?: boolean;  
  includeNumbers?: boolean;  
  includeSpecial?: boolean;  
}
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

//Zalopay
export function encryptHmacSHA256(data:string, key: string){
  return CryptoJS.HmacSHA256(data, key).toString();
}

export function verifyHmacSHA256(originalData: string, key: string, hashToVerify: string) {  
  const generatedHash = encryptHmacSHA256(originalData, key);  
  return generatedHash === hashToVerify;
}

//Galaxypay
export const hashWithSHA256 = (plainText: string) => {
  return CryptoJS.SHA256(plainText);
};

export const genDateTimeNow = () => {
  return new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
};

//generate UID
// Method 1: Using crypto.randomUUID() - Recommended for unique IDs  
export function generateUID(): string {  
  return crypto.randomUUID();  
}  

// Method 2: Custom format with timestamp and random string  
export function generateCustomUID(prefix: string = ''): string {  
  const timestamp = Date.now();  
  const randomStr = Math.random().toString(36).substring(2, 8);  
  return `${prefix}${timestamp}-${randomStr}`;  
}  

// Method 3: Short random ID (good for temporary IDs)  
export function generateShortUID(length: number = 8): string {  
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';  
  let result = '';  
  const cryptoValues = new Uint32Array(length);  
  crypto.getRandomValues(cryptoValues);  
  
  for (let i = 0; i < length; i++) {  
    result += chars[cryptoValues[i] % chars.length];  
  }  
  
  return result;  
}  

// Method 4: Nanoid-like format (URL-friendly)  
export function generateNanoID(size: number = 21): string {  
  const urlAlphabet = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';  
  let id = '';  
  const cryptoValues = new Uint32Array(size);  
  crypto.getRandomValues(cryptoValues);  
  
  for (let i = 0; i < size; i++) {  
    id += urlAlphabet[cryptoValues[i] % urlAlphabet.length];  
  }  
  
  return id;  
}  

// Method 5: Sequential ID with random suffix  
let counter = 0;  
export function generateSequentialUID(): string {  
  const timestamp = Date.now();  
  const count = (counter++).toString().padStart(4, '0');  
  const random = Math.random().toString(36).substring(2, 6);  
  return `${timestamp}-${count}-${random}`;  
}
//end generate UID

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

export function generateUniqueString(options?: StringGeneratorOptions): string {  
  // Set default options  
  const config = {  
    length: options?.length || 5,  
    includeLowercase: options?.includeLowercase ?? true,  
    includeUppercase: options?.includeUppercase ?? false,  
    includeNumbers: options?.includeNumbers ?? true,  
    includeSpecial: options?.includeSpecial ?? false,  
  };  
  
  // Validate length  
  if (config.length < 1 || config.length > 32) {  
    throw new Error('Length must be between 1 and 32 characters');  
  }  
  
  // Prepare character sets  
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';  
  const numbers = '0123456789';  
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';  
  
  // Build character pool based on options  
  let characters = '';  
  if (config.includeLowercase) characters += lowercase;  
  if (config.includeUppercase) characters += uppercase;  
  if (config.includeNumbers) characters += numbers;  
  if (config.includeSpecial) characters += special;  
  
  // Ensure at least one character type is selected  
  if (characters.length === 0) {  
    characters = uppercase + numbers; // Default to original behavior  
  }  
  
  // Generate random string  
  let result = '';  
  for (let i = 0; i < config.length; i++) {  
    const randomIndex = Math.floor(Math.random() * characters.length);  
    result += characters.charAt(randomIndex);  
  }  
  
  return result;  
}  