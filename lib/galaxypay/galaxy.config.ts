// Environment-specific configurations  
const ENVIRONMENTS = {  
    sandbox: {  
        BASE_URL: 'https://uat-secure.galaxypay.vn/api/v1',  
        API_KEY: process.env.GALAXYPAY_SANDBOX_APIKEY!,  
        SALT: process.env.GALAXYPAY_SANDBOX_SALT!, 
    },  
    live: {  
        BASE_URL: 'https://galaxypay.vn/api/v1',  
        API_KEY: process.env.GALAXYPAY_APIKEY!,  
        SALT: process.env.GALAXYPAY_SALT!,
    }  
} as const;

// Get current environment  
const currentEnv = process.env.GALAXYPAY_ENV === 'live' ? 'live' : 'sandbox';  
const env = ENVIRONMENTS[currentEnv];

// Endpoints configuration  
const ENDPOINTS = {  
    create: '/transaction/payWithQR',
    query: '/transaction/query',} as const;

// Main configuration object  
export const galaxyConfig = { 
    api_key: env.API_KEY,
    salt: env.SALT,  
    callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payportal/callback/galaxypay`,  
    expire_duration_seconds: 900,
    bank_code: 'galaxypayapp',
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
export type GalaxyEndpoint = keyof typeof ENDPOINTS;

// Utility function to get full endpoint URL  
export function getEndpointUrl(endpoint: GalaxyEndpoint): string {  
    return galaxyConfig.endpoints[endpoint];  
}

// Utility function to check if in sandbox mode  
export function isSandboxMode(): boolean {  
    return galaxyConfig.isSandbox;  
}

//common Error message
export const GALAXYPAY_RESPONSE_CODE = {
    200: 'Success',
    400: 'Bad Request (Due to missing required fields)',
    401: 'Unauthorized (Invalid API Key or Invalid Signature)',
    408: 'Transaction Expired',
    409: 'Transaction Duplicate',
    499: 'Transaction is cancelled by Customer',
    502: 'Bad Gateway (Cannot connect to Service Provider)',
    503: 'Service Unavailable (Cannot send request to Service Provider)',
    504: 'Request Timeout',
    505: 'Authentication Failure (3DS flow or Not Supporter)',
}

// Type for Galaxypay API responses  
export interface GalaxypayResponse {
    requestID: string;
    responseDateTime: number;
    responseCode: number;
    responseMessage: string;
    responseData: string;
    transactionID: string;
    endpoint: string;
    qrCode: string;
    [key: string]: unknown;  
}