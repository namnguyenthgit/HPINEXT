// Environment-specific configurations  
const ENVIRONMENTS = {  
    sandbox: {  
        BASE_URL: 'https://sb-openapi.zalopay.vn/v2',  
        APP_ID: process.env.ZALOPAY_SANDBOX_APP_ID!,  
        KEY1: process.env.ZALOPAY_SANDBOX_KEY1!,  
        KEY2: process.env.ZALOPAY_SANDBOX_KEY2!,   
    },  
    live: {  
        BASE_URL: 'https://openapi.zalopay.vn/v2/',  
        APP_ID: process.env.ZALOPAY_APP_ID!,  
        KEY1: process.env.ZALOPAY_KEY1!,
        KEY2: process.env.ZALOPAY_KEY2!,
    }  
} as const;

// Get current environment  
const currentEnv = process.env.ZALOPAY_ENV === 'live' ? 'live' : 'sandbox';  
const env = ENVIRONMENTS[currentEnv];

// Endpoints configuration  
const ENDPOINTS = {  
    create: '/create',  
    query: '/query',  
    refund: '/refund',  
    getrefund: '/getrefundstatus',  
    gethistory: '/gethistory',  
    getbanklist: '/getbanklist',  
    quickpay: '/quickpay'  
} as const;

// Main configuration object  
export const zaloConfig = {  
    app_id: env.APP_ID,  
    key1: env.KEY1,
    key2: env.KEY2,  
    callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payportal/callback/zalopay`,  
    expire_duration_seconds: 900,
    bank_code: 'zalopayapp',
    endpoints: Object.fromEntries(  
        Object.entries(ENDPOINTS).map(([key, path]) => [  
            key,  
            `${env.BASE_URL}${path}`  
        ])  
    ),  
    // Helper to check current environment  
    isSandbox: currentEnv === 'sandbox'  
} as const;  

// Types  
export type ZaloEndpoint = keyof typeof ENDPOINTS;

// Utility function to get full endpoint URL  
export function getEndpointUrl(endpoint: ZaloEndpoint): string {  
    return zaloConfig.endpoints[endpoint];  
}  

// Utility function to check if in sandbox mode  
export function isSandboxMode(): boolean {  
    return zaloConfig.isSandbox;  
}

// Type for ZaloPay API responses  
export interface ZaloPayResponse {  
    return_code: number;  
    return_message: string;  
    sub_return_code?: number;  
    sub_return_message?: string;  
    [key: string]: unknown;  
}  

// Common error messages  
export const ZALO_ERROR_MESSAGES = {  
    INVALID_AMOUNT: 'Invalid amount',  
    INVALID_ORDER: 'Invalid order',  
    NETWORK_ERROR: 'Network error occurred',  
    SERVER_ERROR: 'Server error occurred',  
    PAYMENT_FAILED: 'Payment failed',  
} as const;

// Validation utilities  
export const zaloValidators = {  
    isValidAmount: (amount: number) => amount > 0 && Number.isInteger(amount),  
    isValidOrderId: (orderId: string) => /^[A-Za-z0-9_-]{1,64}$/.test(orderId),  
} as const; 