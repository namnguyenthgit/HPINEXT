'use server'  

import { createZalopayOrder, queryZalopayOrder } from './zalopay.actions';  
import { ZaloPayResponse } from "../zalo.config";
import { NextResponse } from 'next/server';
import { PAYMENT_PORTALS, isValidPortal, PaymentPortal, appConfig} from '../appconfig';
import { createPayPortalTrans, getPayPortalTransByDocNo, updatePayPortalTrans } from './payportaltrans.actions';
import { generateUniqueString } from '../utils';
import { lsApiDocReturn, ZaloPayCallbackData, ZalopayCallbackResult } from '@/types';

// Common types for all payment portals  
export interface PaymentRequest {  
    email: string;  
    amount: string;  
    lsDocumentNo: string;  
    payPortalName: "vnpay" | "zalopay" | "ocbpay" | "galaxypay";
    channel: string;
}

interface PaymentQuery {  
    documentNo: string;  
    portalName: string;
} 

interface PaymentResponse extends ZaloPayResponse {  
    payPortalOrder?: string;
    order_url?: string;
    qr_code?: string;

}

export async function fetchLsDocuments(type: string, params: string): Promise<lsApiDocReturn> {  
    try {
        const baseurl = appConfig.baseurl.replace(/\/$/, '');
        const endpoint = `${baseurl}/api/lsretail/getdata/${type}?value=${encodeURIComponent(params)}`;
        console.log(`payportal.action, fetchLsDocuments endpoint: "${endpoint}"`);
        const response = await fetch(endpoint, {  
            method: 'GET',  
        });  

        if (!response.ok) {  
            throw new Error(`Failed to fetch data: ${response.statusText}`);  
        }  

        const data: lsApiDocReturn = await response.json();  
        
        if (!data.success) {  
            throw new Error(data.message || 'Failed to fetch data');  
        }  

        return data;  
    } catch (error) {  
        console.error('Error fetching data:', error);  
        throw error;  
    }  
}

// Helper function to check existing ZaloPay payment  
async function checkExistingZaloPayment(  
    app_trans_id: string | undefined  
): Promise<ZaloPayResponse | null> {  
    if (!app_trans_id) {  
        return null;  
    }   
    
    try {  
        const queryResult = await queryZalopayOrder(app_trans_id);  
        return queryResult;  
    } catch (error) {  
        console.error(`Error querying ZaloPay order "${app_trans_id}":`, error);  
        return null;  
    }  
}

async function safeUpdatePayPortalTrans(documentId: string, data: unknown): Promise<boolean> {  
    try {  
        const result = await updatePayPortalTrans({  
            documentId,  
            data  
        });  
        return result !== null;  
    } catch (error) {  
        console.error('Failed to update PayPortalTrans:', error);  
        return false;  
    }  
}

export async function queryPayment(  
    paymentRequest: PaymentQuery  
): Promise<PaymentResponse> {  
    try {  
        // Get existing transaction  
        const existingPayportalTrans = await getPayPortalTransByDocNo(paymentRequest.documentNo);  

        if (!existingPayportalTrans) {  
            return {  
                return_code: 2,  
                return_message: "Transaction Not Found",  
                sub_return_code: -404,  
                sub_return_message: `No transaction found for document ${paymentRequest.documentNo}`  
            };  
        }  

        // Query payment status from payment portal  
        let paymentStatus;  
        switch (existingPayportalTrans.payPortalName.toLowerCase()) {  
            case 'zalopay':  
                if (existingPayportalTrans.payPortalOrder) {  
                    paymentStatus = await queryZalopayOrder(existingPayportalTrans.payPortalOrder);  
                } else {  
                    return {  
                        return_code: 2,  
                        return_message: "Invalid payPortalTrans",  
                        sub_return_code: -400,  
                        sub_return_message: "payPortalTrans missing payment payPortalOrder"  
                    };  
                }  
                break;  
            default:  
                return {  
                    return_code: 2,  
                    return_message: "Unsupported Payment Portal",  
                    sub_return_code: -400,  
                    sub_return_message: `Portal ${existingPayportalTrans.payPortalName} not supported`  
                };  
        }  

        // Update transaction if status changed  
        if (paymentStatus.return_code === 1) {  
            // Payment successful  
            await safeUpdatePayPortalTrans(  
                existingPayportalTrans.$id,  
                {  
                    status: 'success', 
                }  
            );  
        } else if (paymentStatus.return_code === 3) {  
            // Payment processing  
            await safeUpdatePayPortalTrans(  
                existingPayportalTrans.$id,  
                {  
                    status: 'processing',
                }  
            );  
        } else {  
            // Payment failed or expired  
            await safeUpdatePayPortalTrans(  
                existingPayportalTrans.$id,  
                {  
                    status: 'failed',
                }  
            );  
        }  

        // Return payment portal response with additional transaction info  
        return {  
            ...paymentStatus,
        };  

    } catch (error) {  
        console.error('Query payment error:', error);  
        return {  
            return_code: 2,  
            return_message: "Server Error",  
            sub_return_code: -500,  
            sub_return_message: error instanceof Error ? error.message : 'Unknown error occurred'  
        };  
    }  
}

// Generic payment processing function  
export async function processPayment(  
    paymentRequest: PaymentRequest  
): Promise<PaymentResponse> {  
    const { email, amount, lsDocumentNo, payPortalName, channel } = paymentRequest;  

    if (!amount || !email || !lsDocumentNo || !payPortalName || !channel) {  
        return {  
            return_code: 2,  
            return_message: "Invalid Request",  
            sub_return_code: -400,  
            sub_return_message: "Missing required fields"  
        };  
    }  

    try {  
        const existingPayportalTrans = await getPayPortalTransByDocNo(lsDocumentNo);  
        
        if (existingPayportalTrans && existingPayportalTrans.payPortalOrder) {  
            const existingPayment = await checkExistingZaloPayment(existingPayportalTrans.payPortalOrder);  
            
            if (existingPayment) {  
                // Case 1: Payment is successful => if order create same amount: update payPortalTrans.status to success otherwise raise error
                if (existingPayment.return_code === 1) {
                    if (parseInt(amount) != existingPayment.amount){
                        return {  
                            return_code: 2,  
                            return_message: "Update Failed",  
                            sub_return_message: `You request generate payment with amount:"${amount}" but existing ${payPortalName} payment is "${existingPayment.amount}"`,  
                            payPortalOrder: existingPayportalTrans.payPortalOrder  
                        };    
                    }

                    const updateSuccess = await safeUpdatePayPortalTrans(  
                        existingPayportalTrans.$id,  
                        { status: 'success' }  
                    );  

                    if (!updateSuccess) {  
                        return {  
                            return_code: 2,  
                            return_message: "Update Failed",  
                            sub_return_message: `${payPortalName} payment existed but failed to update transaction status`,  
                            payPortalOrder: existingPayportalTrans.payPortalOrder  
                        };  
                    }  

                    return {  
                        return_code: 3,  
                        return_message: "Payment Already Completed",  
                        sub_return_message: `This document is already paid, ${payPortalName} order is "${existingPayportalTrans.payPortalOrder}"`,  
                        payPortalOrder: existingPayportalTrans.payPortalOrder  
                    };  
                }  

                // // Case 2: Payment is still processing => do nothing
                // if (existingPayment.return_code === 3 && existingPayment.is_processing) {
                //     return {  
                //         return_code: 2,  
                //         return_message: "Payment In Progress",  
                //         sub_return_message: `${payPortalName} Payment "${existingPayportalTrans.payPortalOrder}" is still being processed. Please wait.`,  
                //         payPortalOrder: existingPayportalTrans.payPortalOrder  
                //     };  
                // }

                // Case 2: Payment is still processing
                if (existingPayment.return_code === 3 && existingPayment.is_processing) {
                    //same amount, payPortalName and documentNo dont recreate QR, get latest avaiable QR/paymentURL
                    //console.error(`amount:${amount}, existingPayment.amount:${existingPayment.amount}, payPortalName:${payPortalName}, existingPayportalTrans.payPortalName:${existingPayportalTrans.payPortalName}`)
                    if (parseInt(amount) == existingPayportalTrans.amount && payPortalName == existingPayportalTrans.payPortalName) {
                        try {
                            if (channel != existingPayportalTrans.channel || email != existingPayportalTrans.mail ){
                                await safeUpdatePayPortalTrans(  
                                    existingPayportalTrans.$id,  
                                    { 
                                        email,
                                        channel
                                    }  
                                );
                            }
                        } catch (error) {
                            console.error(`processPayment same amount, payPortalName and documentNo, update payPortalTrans error:"${error}"`)
                        }
                        
                        return {  
                            return_code: 1,  
                            return_message: "Payment In Progress",  
                            sub_return_message: `${payPortalName} Payment "${existingPayportalTrans.payPortalOrder}" is still avaiable. Please rescan before expired!`,  
                            payPortalOrder: existingPayportalTrans.payPortalOrder,
                            order_url: existingPayportalTrans.payPortalPaymentUrl,
                            qr_code: existingPayportalTrans.payPortalQRCode,     
                        };
                    }
                }
                
                // Case 3: payment not found or has error => do nothing
                // if (existingPayment.return_code === 2 && existingPayment.sub_return_code != -54) {  
                //     return {  
                //         return_code: 2,  
                //         return_message: existingPayment.return_message,  
                //         sub_return_message: existingPayment.sub_return_message,  
                //         payPortalOrder: existingPayportalTrans.payPortalOrder  
                //     };  
                // }
            }  

            // Case 3: Payment failed or expired - generate new QR  
            console.log(`Generating new QR for payment ${existingPayportalTrans.payPortalOrder}`);  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount  
            );  

            if (result.return_code === 1) {  
                const updateSuccess = await safeUpdatePayPortalTrans(  
                    existingPayportalTrans.$id,  
                    {  
                        status: 'processing',
                        amount,
                        payPortalOrder: result.payPortalOrder,                        
                        payPortalPaymentUrl: result.order_url,
                        payPortalQRCode: result.qr_code
                    }  
                );  

                if (!updateSuccess && channel != 'lsretail') {
                    //when lsretail call this function even fail create payPortalTrans still let create QR otherwise will pending payment for customer
                    return {  
                        return_code: 2,  
                        return_message: "Update Failed",  
                        sub_return_message: "Failed to update transaction with new payment order"  
                    };
                }  
            }  

            return result;  

        } else {  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount  
            );

            if (result.return_code === 1 && result.payPortalOrder) {
                const newTransaction = await createPayPortalTrans({  
                    email,  
                    payPortalName,
                    channel,
                    amount,  
                    lsDocumentNo,  
                    payPortalOrder: result.payPortalOrder,
                    payPortalPaymentUrl: String(result.order_url),
                    payPortalQRCode: String(result.qr_code),
                });

                if (!newTransaction && channel != 'lsretail') {
                    return {  
                        return_code: 2,  
                        return_message: "Update Failed",  
                        sub_return_message: "Failed to update new transaction with payment order"  
                    };
                }
            }

            return result;
        }  
    } catch (error) {  
        console.error('Process payment error:', error);  
        return {  
            return_code: 2,  
            return_message: "Server Error",  
            sub_return_code: -500,  
            sub_return_message: error instanceof Error ? error.message : 'Unknown error occurred'  
        };  
    }  
}

// Helper function to route to specific payment portal  
async function processPaymentByPortal(  
    portalName: string,  
    email: string,  
    lsDocumentNo: string,  
    amount: string
): Promise<PaymentResponse> {  
    switch (portalName.toLowerCase()) {  
        case 'zalopay':  
            // Create date format yymmdd for app_trans_id  
            const today = new Date();  
            const yy = today.getFullYear().toString().slice(-2);  
            const mm = String(today.getMonth() + 1).padStart(2, '0');  
            const dd = String(today.getDate()).padStart(2, '0');  
            const dateFormat = `${yy}${mm}${dd}`;  

            const uniqueString = generateUniqueString();

            // Format app_trans_id according to ZaloPay requirements  
            const app_trans_id = `${dateFormat}_${uniqueString}_${lsDocumentNo}`;
            const zaloResponse = await createZalopayOrder({  
                app_trans_id,  
                app_user: email,  
                amount,  
                description: `Payment for order #${app_trans_id}`  
            });

            return {  
                ...zaloResponse,  
                payPortalOrder: app_trans_id  
            };
        default:  
            throw new Error(`Unsupported payment portal: ${portalName}`);  
    }  
}

//callback
// Updated callback handling functions  
export async function verifyCallback(  
    portal: string,   
    data: ZaloPayCallbackData  
): Promise<boolean> {  
    if (!isValidPortal(portal)) {  
        throw new Error(`Unsupported payment portal: ${portal}`);  
    }  
    
    try {  
        return PAYMENT_PORTALS[portal].verifyCallback(data);  
    } catch (error) {  
        console.error('Verification error:', error);  
        return false;  
    }  
}


export async function processCallback(  
    portal: string,   
    data: ZaloPayCallbackData  
): Promise<ZalopayCallbackResult> {  
    if (!isValidPortal(portal)) {  
        throw new Error(`Unsupported payment portal: ${portal}`);  
    }  

    const portalConfig = PAYMENT_PORTALS[portal as PaymentPortal];  
    const payPortalTransInfo = portalConfig.extractTransactionInfo(data);  

    const payPortalTrans = await getPayPortalTransByDocNo(payPortalTransInfo.documentNo);  
    if (!payPortalTrans) {  
        throw new Error(`Transaction not found: ${payPortalTransInfo.documentNo}`);  
    }  

    const updateSuccess = await safeUpdatePayPortalTrans(  
        payPortalTrans.$id,  
        {  
            status: payPortalTransInfo.status,  
            callbackProviderTransId: payPortalTransInfo.providerTransId,  
            callbackPaymentTime: payPortalTransInfo.paymentTime,  
            callbackErrorMessage: payPortalTransInfo.errorMessage,  
            rawCallback: JSON.stringify(data)  
        }  
    );  

    if (!updateSuccess) {  
        throw new Error(`Failed to update payPortalTrans: ${payPortalTrans.$id}`);  
    }  

    return {  
        success: payPortalTransInfo.status === 'success',  
        payPortalTransId: payPortalTrans.$id,  
        documentNo: payPortalTransInfo.documentNo  
    };  
} 

export async function formatCallbackResponse(  
    portal: string,   
    result: ZalopayCallbackResult  
): Promise<NextResponse> {  
    switch (portal) {  
        case 'zalopay':  
            return NextResponse.json({  
                return_code: result.success ? 1 : 2,  
                return_message: result.success ? 'success' : 'failed'  
            });  
        
        // Add other portal response formats here  
        
        default:  
            return NextResponse.json({  
                success: result.success,  
                message: result.success ? 'Success' : 'Failed'  
            });  
    }  
}  