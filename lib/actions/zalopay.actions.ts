'user server';

import { createZalopayOrderParams } from "@/types";
import { encryptHmacSHA256 } from "../utils";
import { getEndpointUrl, isSandboxMode, ZALO_ERROR_MESSAGES, zaloConfig, ZaloEndpoint, ZaloPayResponse, zaloValidators } from "../zalo.config";

function generateMac(data: (string | number)[]): string { 
    //console.log('zalopay.actions-generateMac-data:',data.join('|'));
    return encryptHmacSHA256(data.join('|'), zaloConfig.key1).toString();  
}

async function makeZalopayRequest<T = ZaloPayResponse>(endpoint: ZaloEndpoint, data: Record<string, unknown>) : Promise<T> {
    try {
        if (isSandboxMode()) {  
            console.log('zalopay.action-makeZalopayRequest-data:',JSON.stringify(data)) 
        }
        const response = await fetch(getEndpointUrl(endpoint), {  
            method: 'POST',
            headers: {  
                'Content-Type': 'application/json'  
            },  
            body: JSON.stringify(data)
        });

        if (!response.ok) {  
            throw new Error(`HTTP error! status: ${response.status}`);  
        }

        const result = await response.json();

        // Log in sandbox mode only  
        if (isSandboxMode()) {  
            console.log(`ZaloPay ${endpoint} Response:`, result);  
        }  

        return result;
    } catch (error) {
        console.error(`ZaloPay ${endpoint} error:`, error);  
        throw error;
    }    
}

export async function createZalopayOrder(params:createZalopayOrderParams) : Promise<ZaloPayResponse> {
    const {app_trans_id, app_user, amount, description, embed_data = '{}', item='[]'} = params;

    const numericAmount = typeof amount === 'string' ? parseInt(amount, 10) : amount;

    // Validate inputs  
    if (!zaloValidators.isValidAmount(numericAmount)) {  
        throw new Error(ZALO_ERROR_MESSAGES.INVALID_AMOUNT);  
    }  
    if (!zaloValidators.isValidOrderId(app_trans_id)) {  
        throw new Error(ZALO_ERROR_MESSAGES.INVALID_ORDER);  
    }

    const timestamp = Date.now();
    const mac = generateMac([  
        zaloConfig.app_id,  
        app_trans_id,  
        app_user,
        numericAmount,  
        timestamp,  
        embed_data,  
        item  
    ]);

    return makeZalopayRequest('create', {  
        app_id: zaloConfig.app_id,  
        app_user,  
        app_trans_id,
        app_time: timestamp,
        expire_duration_seconds: zaloConfig.expire_duration_seconds,
        amount: numericAmount,
        description,
        item,
        embed_data,
        bank_code: zaloConfig.bank_code,
        callback_url: zaloConfig.callback_url,
        mac
    });
}


export async function queryZalopayOrder(app_trans_id: string): Promise<ZaloPayResponse> {  
    if (!zaloValidators.isValidOrderId(app_trans_id)) {  
        throw new Error(ZALO_ERROR_MESSAGES.INVALID_ORDER);  
    }  

    const mac = generateMac([  
        zaloConfig.app_id,  
        app_trans_id,  
        zaloConfig.key1  
    ]);  

    return makeZalopayRequest('query', {  
        app_id: zaloConfig.app_id,  
        app_trans_id,  
        mac  
    });  
} 