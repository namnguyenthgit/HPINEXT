'use server'

import { payWithGalaxyQRParams } from "@/types";
import { galaxyConfig, GalaxyEndpoint, GalaxypayResponse, getEndpointUrl, isSandboxMode } from "../galaxypay/galaxy.config";
import { genDateTimeNow, generateUID, generateUniqueString, hashWithSHA256 } from "../utils";
import { PaymentResponse } from './payportal.actions';

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
            console.log(`ACTION:makeGalaxypayReques-${endpoint} Response:`, result);  
        }
        return result;
    } catch (error) {
        console.error(`ACTION:makeGalaxypayRequest-${endpoint} error:`, error);  
        throw error;
    }
}

export async function payWithGalaxyQR(params:payWithGalaxyQRParams) : Promise<GalaxypayResponse> {
    const {orderNumber, orderAmount, orderDescription} = params;
    const request = {
        requestID: generateUID(),
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
            sourceType: "QRPAY"
        }
    };

    return makeGalaxypayRequest('create', request);
}

export interface GalaxyPayQueryResponse {
    responseCode: string;
    responseMessage: string;
    responseData?: {
        transactionID: string;
        transactionStage: string;
        transactionStatus: string;
        transactionDescription: string;
        orderAmount: string;
    };
}

export async function queryGalaxyPayOrder(transactionID: string): Promise<PaymentResponse> {
    try {
        const requestID = generateUniqueString();
        const requestDateTime = genDateTimeNow();
        
        const request = {
            requestID,
            requestDateTime,
            requestData: {
                transactionID
            }
        };

        const data = await makeGalaxypayRequest<GalaxyPayQueryResponse>('query', request);

        // Map GalaxyPay status to generic format
        let return_code = 2; // Default to error
        if (data.responseCode === "200") {
            if (data.responseData?.transactionStage === "SUCCESS") {
                return_code = 1; // Success
            } else if (data.responseData?.transactionStage === "PROCESSING") {
                return_code = 3; // Processing
            }
        }

        return {
            return_code,
            return_message: data.responseData?.transactionDescription || data.responseMessage,
            sub_return_code: parseInt(data.responseData?.transactionStatus || "0"),
            sub_return_message: data.responseData?.transactionDescription || "",
            amount: data.responseData?.orderAmount ? parseInt(data.responseData.orderAmount) : 0
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