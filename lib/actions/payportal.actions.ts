// lib/actions/payportal.actions.ts  
'use server'  

import { createTransaction, getTransactionsByDocNo, updateTransaction } from './transaction.actions'; 
import { createZalopayOrder, queryZalopayOrder } from './zalopay.actions';  
import { ZaloPayResponse } from "../zalo.config";
import { NextResponse } from 'next/server';
import { verifyHmacSHA256 } from '../utils';

// Common types for all payment portals  
export interface PaymentRequest {  
    email: string;  
    amount: string;  
    lsDocumentNo: string;  
    payPortalName: string;  
}

type PaymentResponse = ZaloPayResponse; // Union type with other portal responses when added 

// Helper function to check existing ZaloPay payment  
async function checkExistingZaloPayment(  
    lsDocumentNo: string,  
): Promise<ZaloPayResponse | null> {  
    const today = new Date();  
    const yy = today.getFullYear().toString().slice(-2);  
    const mm = String(today.getMonth() + 1).padStart(2, '0');  
    const dd = String(today.getDate()).padStart(2, '0');  
    const dateFormat = `${yy}${mm}${dd}`;  

    // Try to query with time_request from 1 up to a reasonable number  
    for (let timeRequest = 1; timeRequest <= 10; timeRequest++) {  
        const app_trans_id = `${dateFormat}_${timeRequest}_${lsDocumentNo}`;  
        try {  
            const queryResult = await queryZalopayOrder(app_trans_id);  
            if (queryResult.return_code === 1) {  
                return queryResult;  
            }  
        } catch (error) {  
            console.error(`Error querying ZaloPay order for attempt ${timeRequest}:`, error);  
        }  
    }  
    return null;  
} 

// Generic payment processing function  
export async function processPayment(  
    paymentRequest: PaymentRequest  
): Promise<PaymentResponse> {  
    const { email, amount, lsDocumentNo, payPortalName } = paymentRequest;  

    // Validate request  
    if (!amount || !email || !lsDocumentNo || !payPortalName) {  
        return {  
            return_code: 2,  
            return_message: "Invalid Request",  
            sub_return_code: -400,  
            sub_return_message: "Missing required fields"  
        };  
    }  

    try {    
        const existingPayment = await checkExistingZaloPayment(lsDocumentNo);
        if (existingPayment?.return_code === 1) {  
            // Payment exists and is successful  
            const transaction = await getTransactionsByDocNo(lsDocumentNo);  
            if (transaction) {  
                // Update existing transaction to success  
                await updateTransaction({  
                    documentId: transaction.$id,  
                    data: { status: 'success' }  
                });  
            } else {
                // Create new transaction  
                await createTransaction({  
                    email,  
                    payPortalName,  
                    amount,  
                    lsDocumentNo,  
                    time_request: '1'  
                });

                 // Then update its status to success  
                const newTransaction = await getTransactionsByDocNo(lsDocumentNo);  
                if (newTransaction) {  
                    await updateTransaction({  
                        documentId: newTransaction.$id,  
                        data: { status: 'success' }  
                    });  
                }
                return {  
                    return_code: 3,  
                    return_message: "Payment Already Processed",  
                    sub_return_message: "This document has already been paid successfully"  
                };
            }
           
        }

        // Check existing transaction  
        const transaction = await getTransactionsByDocNo(lsDocumentNo);

        if (transaction) {  
            // Handle existing transaction  
            if (transaction.status === 'success') {  
                return {  
                    return_code: 3,  
                    return_message: "Payment Already Processed",  
                    sub_return_message: "This document has already been paid successfully"  
                };  
            }  

            if (transaction.status !== 'processing') {  
                return {  
                    return_code: 2,  
                    return_message: "Invalid Transaction State",  
                    sub_return_message: "Transaction is not in processing state"  
                };  
            }  

            const newTimeRequest = (parseInt(transaction.time_request) + 1).toString();  

            // Process payment based on portal  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount,  
                newTimeRequest  
            );

            // Only update transaction if payment processing was successful  
            if (result.return_code === 1) {  
                await updateTransaction({  
                    documentId: transaction.$id,  
                    data: { time_request: newTimeRequest }  
                });  
            }

            return {  
                ...result,  
                attempt: newTimeRequest  
            };  
        } else {  
            // Handle new transaction  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount,  
                '1'  
            );  

            if (result.return_code === 1) {  
                const newTransaction = await createTransaction({  
                    email,  
                    payPortalName,  
                    amount,  
                    lsDocumentNo,  
                    time_request: '1'  
                });  

                if (!newTransaction) {  
                    return {  
                        return_code: 2,  
                        return_message: "Failed to create transaction record",  
                        sub_return_code: -500,  
                        sub_return_message: "Transaction creation failed"  
                    };  
                }  
            }  

            return {  
                ...result,  
                attempt: '1'  
            };  
        }  
    } catch (error) {  
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
    amount: string,  
    timeRequest: string 
): Promise<PaymentResponse> {  
    switch (portalName.toLowerCase()) {  
        case 'zalopay':  
            // Create date format yymmdd for app_trans_id  
            const today = new Date();  
            const yy = today.getFullYear().toString().slice(-2);  
            const mm = String(today.getMonth() + 1).padStart(2, '0');  
            const dd = String(today.getDate()).padStart(2, '0');  
            const dateFormat = `${yy}${mm}${dd}`;  
 
             // Format app_trans_id according to ZaloPay requirements  
            const app_trans_id = `${dateFormat}_${timeRequest}_${lsDocumentNo}`;
            return createZalopayOrder({  
                app_trans_id,  
                app_user: email,  
                amount,  
                description: `Payment for order #${app_trans_id}`  
            });
        default:  
            throw new Error(`Unsupported payment portal: ${portalName}`);  
    }  
}

//callback
//callback type
interface TransactionInfo {  
    documentNo: string;  
    status: 'success' | 'failed';  
    providerTransId: string;  
    paymentTime: string;  
    errorMessage?: string;  
}  

interface ZaloPayCallbackData {  
    app_trans_id: string;  
    app_time: number;  
    app_user: string;  
    amount: number;  
    embed_data: string;  
    item: string;  
    zp_trans_id: string;  
    server_time: number;  
    channel: number;  
    merchant_user_id: string;  
    user_fee_amount: number;  
    discount_amount: number;  
    status: number;  
    error_message?: string;  
    mac: string;  
}  

interface CallbackResult {  
    success: boolean;  
    transactionId: string;  
    documentNo: string;  
}

// Payment portal configurations  
const PAYMENT_PORTALS = {  
    zalopay: {  
        key: process.env.ZALOPAY_KEY2!,  
        verifyCallback: (data: ZaloPayCallbackData): boolean => {  
            const { mac, ...dataWithoutMac } = data;  
            const dataStr = Object.keys(dataWithoutMac)  
                .sort()  
                .map(key => `${key}=${dataWithoutMac[key as keyof typeof dataWithoutMac]}`)  
                .join('|');  
                return verifyHmacSHA256(dataStr, PAYMENT_PORTALS.zalopay.key, mac); 
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

type PaymentPortal = keyof typeof PAYMENT_PORTALS;

// Updated callback handling functions  
export async function verifyCallback(  
    portal: string,   
    data: ZaloPayCallbackData  
): Promise<boolean> {  
    if (!isValidPortal(portal)) {  
        throw new Error(`Unsupported payment portal: ${portal}`);  
    }  
    
    return PAYMENT_PORTALS[portal as PaymentPortal].verifyCallback(data);  
}


export async function processCallback(  
    portal: string,   
    data: ZaloPayCallbackData  
): Promise<CallbackResult> {  
    if (!isValidPortal(portal)) {  
        throw new Error(`Unsupported payment portal: ${portal}`);  
    }  

    const portalConfig = PAYMENT_PORTALS[portal as PaymentPortal];  
    
    // Extract transaction info  
    const transactionInfo = portalConfig.extractTransactionInfo(data);  

    // Get transaction from database  
    const transaction = await getTransactionsByDocNo(transactionInfo.documentNo);  
    if (!transaction) {  
        throw new Error(`Transaction not found: ${transactionInfo.documentNo}`);  
    }  

    // Update transaction  
    await updateTransaction({  
        documentId: transaction.$id,  
        data: {  
            status: transactionInfo.status,  
            provider_trans_id: transactionInfo.providerTransId,  
            payment_time: transactionInfo.paymentTime,  
            error_message: transactionInfo.errorMessage,  
            raw_callback: JSON.stringify(data)  
        }  
    });  

    return {  
        success: transactionInfo.status === 'success',  
        transactionId: transaction.$id,  
        documentNo: transactionInfo.documentNo  
    };  
}  

export function formatCallbackResponse(  
    portal: string,   
    result: CallbackResult  
): NextResponse {  
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

function isValidPortal(portal: string): portal is PaymentPortal {  
    return portal in PAYMENT_PORTALS;  
} 