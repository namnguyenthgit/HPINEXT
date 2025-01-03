import { ParsedZaloPayData, RawZaloPayCallback, TransactionInfo, ZaloPayCallbackData } from "@/types";
import { verifyHmacSHA256 } from "./utils";
import { zaloConfig } from "./zalo.config";

export const appConfig = {
    title: 'HPI-Next',
    description: 'Hoang Phuc International management system',
    icon: "/icons/logo.svg",
    baseurl: process.env.NEXT_PUBLIC_SITE_URL,
    //others
} as const;

export function getLSRetailConfig() {  
    const baseurl = process.env.LSRETAIL_BASE_URL;  
    const token = process.env.LSRETAIL_TOKEN;  

    if (!baseurl || !token) {  
        throw new Error('Missing required LS Retail configuration');  
    }  

    return {  
        baseurl,
        token  
    };  
}

function isRecord(value: unknown): value is Record<string, unknown> {  
    return typeof value === 'object' && value !== null;  
}

function isRawZaloPayCallback(data: unknown): data is RawZaloPayCallback {  
    if (!isRecord(data)) return false;  
    
    return (  
        typeof data.data === 'string' &&  
        typeof data.mac === 'string' &&  
        typeof data.type === 'number'  
    );  
}

function isZaloPayCallbackData(data: unknown): data is ZaloPayCallbackData {  
    if (!isRecord(data)) return false;  

    return (  
        typeof data.app_trans_id === 'string' &&  
        typeof data.app_time === 'number' &&  
        typeof data.amount === 'number'  
        // Add more specific checks as needed  
    );  
}

export const PAYMENT_PORTALS = {  
    zalopay: {  
        key: zaloConfig.isSandbox ? zaloConfig.key1 : process.env.ZALOPAY_KEY2!,  
        verifyCallback: (rawData: ZaloPayCallbackData): boolean => {  
            try {  
                let dataToVerify: ZaloPayCallbackData;  
                let macToVerify: string;  

                if (isRawZaloPayCallback(rawData)) {  
                    const parsedData = JSON.parse(rawData.data) as ParsedZaloPayData;  
                    dataToVerify = {  
                        ...parsedData,  
                        status: rawData.type === 1 ? 1 : 0  
                    };  
                    macToVerify = rawData.mac;  
                } else if (isZaloPayCallbackData(rawData)) {  
                    dataToVerify = rawData;  
                    macToVerify = rawData.mac || '';  
                } else {  
                    throw new Error('Invalid data format');  
                }  

                // Remove mac from the data to verify  
                const { mac, ...dataWithoutMac } = dataToVerify;  

                // Create the data string for verification  
                const dataStr = Object.entries(dataWithoutMac)  
                    .sort(([a], [b]) => a.localeCompare(b))  
                    .map(([key, value]) => `${key}=${value}`)  
                    .join('|');  
                
                const verificationKey = zaloConfig.isSandbox ?   
                    zaloConfig.key1 :   
                    process.env.ZALOPAY_KEY2!;  
                
                return verifyHmacSHA256(dataStr, verificationKey, macToVerify);  
            } catch (error) {  
                console.error('ZaloPay verification error:', error instanceof Error ? error.message : 'Unknown error');  
                return false;  
            }  
        },  
        extractTransactionInfo: (data: ZaloPayCallbackData): TransactionInfo => {  
            try {  
                let processedData: ZaloPayCallbackData;  

                if (isRawZaloPayCallback(data)) {  
                    const parsedData = JSON.parse(data.data) as ParsedZaloPayData;  
                    processedData = {  
                        ...parsedData,  
                        status: data.type === 1 ? 1 : 0  
                    };  
                } else if (isZaloPayCallbackData(data)) {  
                    processedData = data;  
                } else {  
                    throw new Error('Invalid data format');  
                }  

                return {  
                    documentNo: processedData.app_trans_id.split('_')[2],  
                    status: (processedData.status === 1) ? 'success' : 'failed',  
                    providerTransId: String(processedData.zp_trans_id),  
                    paymentTime: new Date(processedData.app_time).toISOString(),  
                    errorMessage: processedData.error_message  
                };  
            } catch (error) {  
                console.error('Error extracting transaction info:', error instanceof Error ? error.message : 'Unknown error');  
                throw new Error('Failed to extract transaction information');  
            }  
        }  
    },  
} as const;  

export type PaymentPortal = keyof typeof PAYMENT_PORTALS;  

export function isValidPortal(portal: string): portal is PaymentPortal {  
    return portal in PAYMENT_PORTALS;  
}