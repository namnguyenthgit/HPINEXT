/* eslint-disable no-unused-vars */
declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export type tableSelectLimitOption = 50 | 100 | 200 | 500 | "all";  

// ========================================

declare type SignUpParams = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
};

declare type LoginUser = {
  email: string;
  password: string;
};

declare type User = {
  $id: string;
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  storeNo: string;
};

declare type Account = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  appwriteItemId: string;
  shareableId: string;
};

declare type Transaction = {
  id: string;
  $id: string;
  name: string;
  paymentChannel: string;
  type: string;
  accountId: string;
  amount: number;
  pending: boolean;
  category: string;
  date: string;
  image: string;
  type: string;
  $createdAt: string;
  channel: string;
  senderBankId: string;
  receiverBankId: string;
};

type AppwriteTransaction = {  
  email?: string;  
  payPortalName?: string;  
  channel?: string;  
  status?: string;  
  amount?: string;  
  lsDocumentNo?: string;  
  time_request?: string;  
  // Add other possible attributes here  
}

// Plaid Transaction Interface  
declare interface PlaidTransaction {  
  transaction_id: string;  
  name: string;  
  payment_channel: string;  
  account_id: string;  
  amount: number;  
  pending: boolean;  
  category?: string[];  
  date: string;  
  logo_url?: string;  
}  

// Formatted Transaction Interface  
declare interface FormattedTransaction {  
  id: string;  
  name: string;  
  paymentChannel: string;  
  type: string;  
  accountId: string;  
  amount: number;  
  pending: boolean;  
  category: string;  
  date: string;  
  image?: string;  
}  

declare type Bank = {
  $id: string;
  accountId: string;
  bankId: string;
  accessToken: string;
  fundingSourceUrl: string;
  userId: string;
  shareableId: string;
};

declare type AccountTypes =
  | "depository"
  | "credit"
  | "loan "
  | "investment"
  | "other";

declare type Category = "Food and Drink" | "Travel" | "Transfer";

declare type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
};

declare type Receiver = {
  firstName: string;
  lastName: string;
};

declare type TransferParams = {
  sourceFundingSourceUrl: string;
  destinationFundingSourceUrl: string;
  amount: string;
};

declare type AddFundingSourceParams = {
  dwollaCustomerId: string;
  processorToken: string;
  bankName: string;
};

declare type NewDwollaCustomerParams = {
  firstName: string;
  lastName: string;
  email: string;
  type: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
};

declare interface CreditCardProps {
  account: Account;
  userName: string;
  showBalance?: boolean;
}

declare interface BankInfoProps {
  account: Account;
  appwriteItemId?: string;
  type: "full" | "card";
}

declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  user?: string;
}

declare interface MobileNavProps {
  user: User;
}

declare interface PageHeaderProps {
  topTitle: string;
  bottomTitle: string;
  topDescription: string;
  bottomDescription: string;
  connectBank?: boolean;
}

declare interface PaginationProps {
  page: number;
  totalPages: number;
}

declare interface PlaidLinkProps {
  user: User;
  variant?: "primary" | "ghost";
  dwollaCustomerId?: string;
}

// declare type User = sdk.Models.Document & {
//   accountId: string;
//   email: string;
//   name: string;
//   items: string[];
//   accessToken: string;
//   image: string;
// };

declare interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

declare interface BankDropdownProps {
  accounts: Account[];
  setValue?: UseFormSetValue<unknown>;
  otherStyles?: string;
}

declare interface BankTabItemProps {
  account: Account;
  appwriteItemId?: string;
}

declare interface TotlaBalanceBoxProps {
  accounts: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
}

declare interface FooterProps {
  user: User;
  type?: 'mobile' | 'desktop';
}

declare interface RightSidebarProps {
  user: User;
  transactions: Transaction[];
  banks: Bank[] & Account[];
}

declare interface SiderbarProps {
  user: User;
}

declare interface RecentTransactionsProps {
  accounts: Account[];
  transactions: Transaction[];
  appwriteItemId: string;
  page: number;
}

declare interface TransactionHistoryTableProps {
  transactions: Transaction[];
  page: number;
}

declare interface CategoryBadgeProps {
  category: string;
}

declare interface TransactionTableProps {
  transactions: Transaction[];
}

declare interface CategoryProps {
  category: CategoryCount;
}

declare interface DoughnutChartProps {
  accounts: Account[];
}

declare interface PaymentTransferFormProps {
  accounts: Account[];
}

// Actions
declare interface getAccountsProps {
  userId: string;
}

declare interface getAccountProps {
  appwriteItemId: string;
}

declare interface getInstitutionProps {
  institutionId: string;
}

declare interface getTransactionsProps {
  accessToken: string;
}

declare interface CreateFundingSourceOptions {
  customerId: string; // Dwolla Customer ID
  fundingSourceName: string; // Dwolla Funding Source Name
  plaidToken: string; // Plaid Account Processor Token
  _links: object; // Dwolla On Demand Authorization Link
}

declare type PayPortal = 'Zalopay' | 'OCB pay' | 'Galaxy Pay';  

interface ZaloPayRequest {  
  app_id: number; // Changed to number  
  app_trans_id: string;  
  app_user: string;  
  app_time: number;  
  amount: number;  
  item: string;  
  description: string;  
  embed_data: string;  
  bank_code: string;  
  expire_duration_seconds: number; // Added this field  
  mac: string;  
}  

interface ZaloPayResponse {  
  return_code: number;  
  return_message: string;  
  sub_return_code: number;  
  sub_return_message: string;  
  order_url?: string;  
  order_token?: string;  
  zp_trans_token?: string;  
  qr_code?: string;  
}

declare interface PaymentRequest {  
  payPortalName: PayPortal;  
  lsDocumentNo: string;  
  amount: string;  
}  

declare interface ZaloPayResponse {  
  return_code: number;  
  return_message: string;  
  sub_return_code: number;  
  sub_return_message: string;  
  order_url: string;  
  qr_code: string;  
}  


export interface PayPortalTrans {  
  $id: string;  
  $createdAt: string;  
  $updatedAt: string;  
  $permissions: string[];  
  $databaseId: string;  
  $collectionId: string;  
  email: string;  
  payPortalName: string;  
  channel: string;  
  status: string;  
  amount: string;  
  lsDocumentNo: string;  
  payPortalOrder: string;  
  callbackProviderTransId: string | null;  
  callbackPaymentTime: string | null;  
  callbackErrorMessage: string;  
  rawCallback: string | null;  
  payPortalPaymentUrl: string;  
  payPortalQRCode: string;  
  terminalId: string;  
}

declare interface CreatePayPortalTransProps {
  email: string;
  payPortalName: string;
  channel: string;
  terminalId: string;
  amount: string;
  lsDocumentNo: string;
  payPortalOrder: string;
  payPortalPaymentUrl: string;
  payPortalQRCode: string;
}

interface UpdatePayPortalTransProps {  
  documentId: string;  
  data: Partial<TransactionAttributes>;  // Allows any combination of attributes  
}

declare interface getTransactionsByBankIdProps {
  bankId: string;
}

declare interface getPayPortalTransByEmailProps {
  email: string;
}

declare interface getPayPortalTransByDocNoProps {
  lsDocumentNo: string;
}
declare interface signInProps {
  email: string;
  password: string;
}

declare interface getUserInfoProps {
  userId: string;
}

declare interface exchangePublicTokenProps {
  publicToken: string;
  user: User;
}

declare interface createBankAccountProps {
  accessToken: string;
  userId: string;
  accountId: string;
  bankId: string;
  fundingSourceUrl: string;
  shareableId: string;
}

declare interface getBanksProps {
  userId: string;
}

declare interface getBankProps {
  documentId: string;
}

declare interface getBankByAccountIdProps {
  accountId: string;
}

declare interface createPrivateBankAccountProps {
  privateBankId: string;
  bankName:string;
  privateAccountNumber: string;
  bankCardNumber: string;  
  availableBalance: string;
  currentBalance: string;
  type: string;
  shareableId: string;
  userId: string;
}

declare interface AddBankProps {  
  userId: string;  
}

//zalopay
declare interface createZalopayOrderParams {
  app_trans_id: string;  
  app_user: string;  
  amount: string | number; 
  description: string;  
  embed_data?: string;  
  item?: string;
}

//payPortalCallback
interface ZalopayCallbackData {  
  app_id: number;
  app_trans_id: string;  
  app_time: number;  
  app_user: string;  
  amount: number;  
  embed_data: string;  
  item: string;  
  zp_trans_id: number;  
  server_time: number;  
  channel?: number;  
  merchant_user_id?: string;  
  user_fee_amount?: number;  
  discount_amount?: number;  
}

// Specific ZaloPay callback interface  
interface ZaloPayCallback extends PayPortalCallbackData {  
  data: ZaloPayData;  
  mac: string;  
  type: number;  
}

interface RawCallbackData {  
  data: string;  
  mac?: string;  
  type?: number;  
}

interface parsedPPTCallbackData {
  payPortalOrder: string;
  callbackProviderTransId: string;
  callbackamount: string;
  callbackPaymentTime?: string;
  callbackErrorMessage?: string;
  rawCallback?: string;
}

interface ParsedPPTCallbackDataAccept {  
  parsedData: ParsedPPTCallbackData | null;  
  error?: string;  
}

interface PayPortalCallbackData {
  data: string | ZaloPayData;
  [key: string]: unknown;
}

interface PayPortalCallbackResult {
  success: boolean;
  message?: string;
}


//lsretail
export interface lsApiDocReturn {  
  success: boolean;  
  message?: string;  
  data?: {
    Receipt_no?: string[];  
    // Add other possible data structures
  };
  error?: string; 
}


export interface LSRetailResponse<T> {  
  success: boolean;  
  message?: string;  
  data?: T;  
  error?: string;  
}  

export interface LSRetailDocumentResponse {  
  Receipt_no: string[];
  [key: string]: unknown;  
}

export interface LSRetailTransactionLine {  
  Receipt_no: string;  
  Store_no: string;  
  // ... other fields  
}

export interface LSRetailTransactionResponse {  
  data: LSRetailTransactionLine[];  
} 

//auth
export type UserRole = 'admin' | 'user' | undefined;  

export interface SessionVerificationResult {  
  isValid: boolean;  
  error?: string;  
} 