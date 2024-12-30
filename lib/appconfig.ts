import { verifyHmacSHA256 } from "./utils";
import { zaloConfig } from "./zalo.config";

export const appConfig = {
    title: 'HPI-Next',
    description: 'Hoang Phuc International management system',
    icon: "/icons/logo.svg"
    //others
}

export const PAYMENT_PORTALS = {  
    zalopay: {  
        key: zaloConfig.isSandbox ? zaloConfig.key1 : process.env.ZALOPAY_KEY2!,  
        verifyCallback: (data: ZaloPayCallbackData): boolean => {  
            const { mac, ...dataWithoutMac } = data;  
            const dataStr = Object.keys(dataWithoutMac)  
                .sort()  
                .map(key => `${key}=${dataWithoutMac[key as keyof typeof dataWithoutMac]}`)  
                .join('|');  
            
            // Use the appropriate key based on environment  
            const verificationKey = zaloConfig.isSandbox ?   
                zaloConfig.key1 :   
                process.env.ZALOPAY_KEY2!;  
            
            return verifyHmacSHA256(dataStr, verificationKey, mac);   
        },  
        extractTransactionInfo: (data: ZaloPayCallbackData): TransactionInfo => ({  
            documentNo: data.app_trans_id.split('_')[2],  
            status: data.status === 1 ? 'success' : 'failed',  
            providerTransId: data.zp_trans_id,  
            paymentTime: new Date(data.app_time).toISOString(),  
            errorMessage: data.error_message  
        })  
    },  
    // Add other payment portals here  
} as const;  

export type PaymentPortal = keyof typeof PAYMENT_PORTALS;  

export function isValidPortal(portal: string): portal is PaymentPortal {  
    return portal in PAYMENT_PORTALS;  
} 