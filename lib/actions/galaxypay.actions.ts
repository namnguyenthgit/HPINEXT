'use server'

import { payWithGalaxyQRParams } from "@/types";
import { galaxyConfig, GalaxyEndpoint, GalaxypayResponse, getEndpointUrl, isSandboxMode } from "../galaxypay/galaxy.config";
import { genDateTimeNow, generateUID, hashWithSHA256 } from "../utils";

async function makeGalaxypayRequest<T = GalaxypayResponse>(endpoint: GalaxyEndpoint, data: Record<string, unknown>) : Promise<T> {
    try {
        if (isSandboxMode()){
            console.log('galaxypay.action-makeGalaxypayRequest-data:',JSON.stringify(data));
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

        const result = await response.json();

        // Log in sandbox mode only  
        if  (isSandboxMode()) {  
            console.log(`Zalopay ${endpoint} Response:`, result);  
        }
        return result;
    } catch (error) {
        console.error(`Galaxypay ${endpoint} error:`, error);  
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