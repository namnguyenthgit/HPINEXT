'use server'

import { payWithGalaxyQRParams } from "@/types";
import { galaxyConfig, GalaxyEndpoint, GalaxypayResponse, getEndpointUrl, isSandboxMode } from "../galaxypay/galaxy.config";
import { genDateTimeNow, generateUID, generateUniqueString, hashWithSHA256 } from "../utils";
import { PaymentResponse } from './payportal.actions';
import { appConfig } from "../appconfig";

interface GalaxyPayQueryResponse {  
    requestID: string;  
    responseDateTime: number | string;  
    responseCode: number | string;  
    responseMessage: string;  
    responseData: string; // This is a JSON string, not an object  
    transactionID?: string;  
}

interface GalaxyPayTransactionData {  
    transactionID: string;  
    transactionDateTime: number;  
    transactionStage: string;  
    transactionStatus: string;  
    transactionDescription: string;  
    orderID: string;  
    orderNumber: string;  
    orderAmount: string;  
    orderCurrency: string;  
    orderDateTime: string;  
    orderDescription: string;  
  }
async function makeGalaxypayRequest<T = GalaxypayResponse>(endpoint: GalaxyEndpoint, data: Record<string, unknown>) : Promise<T> {
    try {
        if (isSandboxMode()){
            console.log(`ACTION:makeGalaxypayRequest-${endpoint}-data:`,JSON.stringify(data));
        }
        const apikey = galaxyConfig.api_key;
        const salt = galaxyConfig.salt;
        // Serialize Object to String
        const bodycontent = JSON.stringify(data);
        const signature = hashWithSHA256(bodycontent + salt).toString();
        const response = await fetch(getEndpointUrl(endpoint), {
            method: 'POST',
            headers: {  
                'Content-Type': 'application/json',
                'apikey': apikey,
                'signature': signature,
            },  
            body: bodycontent
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);  
        }

        const rawResult = await response.json();

        const result = {  
            ...rawResult,  
            responseDateTime: parseInt(rawResult.responseDateTime),  
            responseCode: parseInt(rawResult.responseCode),  
            // Extract nested values to root level  
            qrCode: rawResult.responseData.qrCode,  
            transactionID: rawResult.responseData.transactionID,
            endpoint: rawResult.responseData.endpoint,  
            // Convert responseData to string as per interface  
            responseData: JSON.stringify(rawResult.responseData)  
        };

        // Log in sandbox mode only  
        if  (isSandboxMode()) {  
            console.log(`ACTION:makeGalaxypayRequest-${endpoint} Response:`, result);  
        }
        return result;
    } catch (error) {
        console.error(`ACTION:makeGalaxypayRequest-${endpoint} error:`, error);  
        throw error;
    }
}

export async function payWithGalaxyQR(params:payWithGalaxyQRParams) : Promise<GalaxypayResponse> {
    const {orderNumber, orderAmount, orderDescription} = params;
    const calbackurl = `${appConfig.baseurl}/api/payportal/callback/galaxypay`;
    const request = {
        requestID:  generateUniqueString({length: 32}),
        requestDateTime: genDateTimeNow(),
        requestData: {
            apiOperation: "PAY",
            orderID: generateUID(),
            orderNumber: orderNumber,
            orderAmount: orderAmount,
            orderCurrency: "VND",
            orderDateTime: genDateTimeNow(),
            orderDescription: orderDescription,
            paymentMethod: "QRPAY",
            sourceType: "QRPAY",
            //successURL:calbackurl,
            //failureURL:calbackurl,
            //cancelURL:calbackurl,
            ipnURL:calbackurl,
                
        }
    };

    return makeGalaxypayRequest('create', request);
}

export async function queryGalaxyPayOrder(transactionID: string): Promise<PaymentResponse> {  
    try {  
        const requestID = generateUniqueString({length: 32});  
        const requestDateTime = genDateTimeNow();  
        
        const request = {  
            requestID,  
            requestDateTime,  
            requestData: {  
                transactionID  
            }  
        };  

        const response = await makeGalaxypayRequest<GalaxyPayQueryResponse>('query', request);  
        console.log('Full response:', JSON.stringify(response, null, 2));  
        
        // Parse the responseData string into an object  
        let responseData: GalaxyPayTransactionData | null = null;  
        if (typeof response.responseData === 'string') {  
            try {  
                responseData = JSON.parse(response.responseData);  
            } catch (e) {  
                console.error('Failed to parse responseData:', e);  
            }  
        }  
        console.log('Parsed responseData:', responseData);  
        
        // Map GalaxyPay status to generic format  
        let return_code = 2; // Default to error  
        const responseCodeNum = typeof response.responseCode === 'string'   
            ? parseInt(response.responseCode)   
            : response.responseCode;  
            
        if (responseCodeNum === 200) {  
            if (responseData?.transactionStage) {  
                const stage = responseData.transactionStage;  
                console.log(`Transaction stage: "${stage}"`);  
                
                if (stage === "SUCCESSFUL") {  
                    return_code = 1; // Success  
                } else if (stage === "PROCESSING") {  
                    return_code = 3; // Processing  
                }  
            }  
        }  

        return {  
            return_code,  
            return_message: responseData?.transactionDescription || response.responseMessage || "",  
            sub_return_code: responseData?.transactionStatus ? parseInt(responseData.transactionStatus) : 0,  
            sub_return_message: responseData?.transactionDescription || "",  
            amount: responseData?.orderAmount ? parseFloat(responseData.orderAmount) : 0,
            is_processing: return_code === 3,  
        };  
    } catch (error) {  
        console.error('Error querying GalaxyPay order:', error);  
        return {  
            return_code: 2,  
            return_message: 'Query Failed',  
            sub_return_code: -500,  
            sub_return_message: error instanceof Error ? error.message : 'Unknown error occurred'  
        };  
    }  
} 