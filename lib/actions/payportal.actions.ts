// lib/actions/payportal.actions.ts  
'use server'  

import { createZalopayOrder, queryZalopayOrder } from './zalopay.actions';  
import { ZaloPayResponse } from "../zalo.config";
import { NextResponse } from 'next/server';
import { PAYMENT_PORTALS, isValidPortal, PaymentPortal } from '../appconfig';
import { createPayPortalTrans, deletePayPortalTrans, getPayPortalTransByDocNo, updatePayPortalTrans } from './payportaltrans.actions';
import { generateUniqueString } from '../utils';
import { CallbackResult, ZaloPayCallbackData } from '@/types';

// Common types for all payment portals  
export interface PaymentRequest {  
    email: string;  
    amount: string;  
    lsDocumentNo: string;  
    payPortalName: "VNPay" | "Zalopay" | "OCB pay" | "Galaxy Pay";
}

interface PaymentResponse extends ZaloPayResponse {  
    payPortalOrder?: string;  
    attempt?: string;  
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

// Generic payment processing function  
export async function processPayment(  
    paymentRequest: PaymentRequest  
): Promise<PaymentResponse> {  
    const { email, amount, lsDocumentNo, payPortalName } = paymentRequest;  

    if (!amount || !email || !lsDocumentNo || !payPortalName) {  
        return {  
            return_code: 2,  
            return_message: "Invalid Request",  
            sub_return_code: -400,  
            sub_return_message: "Missing required fields"  
        };  
    }  

    try {  
        const payPortalTrans = await getPayPortalTransByDocNo(lsDocumentNo);  
        
        if (payPortalTrans && payPortalTrans.payPortalOrder) {  
            const existingPayment = await checkExistingZaloPayment(payPortalTrans.payPortalOrder);  
            
            if (existingPayment) {  
                // Case 1: Payment is successful  
                if (existingPayment.return_code === 1) {  
                    const updateSuccess = await safeUpdatePayPortalTrans(  
                        payPortalTrans.$id,  
                        { status: 'success' }  
                    );  

                    if (!updateSuccess) {  
                        return {  
                            return_code: 2,  
                            return_message: "Update Failed",  
                            sub_return_message: "Failed to update transaction status",  
                            payPortalOrder: payPortalTrans.payPortalOrder  
                        };  
                    }  

                    return {  
                        return_code: 3,  
                        return_message: "Payment Already Completed",  
                        sub_return_message: `This document is already paid, ${payPortalName} order is "${payPortalTrans.payPortalOrder}"`,  
                        payPortalOrder: payPortalTrans.payPortalOrder  
                    };  
                }  

                // Case 2: Payment is still processing  
                if (existingPayment.return_code === 3 && existingPayment.is_processing) {  
                    return {  
                        return_code: 2,  
                        return_message: "Payment In Progress",  
                        sub_return_message: `${payPortalName} Payment "${payPortalTrans.payPortalOrder}" is still being processed. Please wait.`,  
                        payPortalOrder: payPortalTrans.payPortalOrder  
                    };  
                }

                if (existingPayment.return_code === 2 && existingPayment.sub_return_code != -54) {  
                    return {  
                        return_code: 2,  
                        return_message: existingPayment.return_message,  
                        sub_return_message: existingPayment.sub_return_message,  
                        payPortalOrder: payPortalTrans.payPortalOrder  
                    };  
                }
            }  

            // Case 3: Payment failed or expired - generate new QR  
            console.log(`Generating new QR for payment ${payPortalTrans.payPortalOrder}`);  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount  
            );  

            if (result.return_code === 1) {  
                const updateSuccess = await safeUpdatePayPortalTrans(  
                    payPortalTrans.$id,  
                    {  
                        payPortalOrder: result.payPortalOrder,  
                        status: 'processing',
                    }  
                );  

                if (!updateSuccess) {  
                    return {  
                        return_code: 2,  
                        return_message: "Update Failed",  
                        sub_return_message: "Failed to update transaction with new payment order"  
                    };  
                }  
            }  

            return result;  

        } else {  
            // Handle new transaction creation  
            const newTransaction = await createPayPortalTrans({  
                email,  
                payPortalName,  
                amount,  
                lsDocumentNo,  
                payPortalOrder: '',
            });  

            if (newTransaction) {  
                const result = await processPaymentByPortal(  
                    payPortalName,  
                    email,  
                    lsDocumentNo,  
                    amount  
                );  

                if (result.return_code === 1 && result.payPortalOrder) {   
                    const updateSuccess = await safeUpdatePayPortalTrans(  
                        newTransaction.$id,  
                        {   
                            payPortalOrder: result.payPortalOrder,  
                            status: 'processing'  
                        }  
                    );  

                    if (!updateSuccess) {  
                        await deletePayPortalTrans(newTransaction.$id);  
                        return {  
                            return_code: 2,  
                            return_message: "Update Failed",  
                            sub_return_message: "Failed to update new transaction with payment order"  
                        };  
                    }  

                    return result;  
                } else {  
                    await deletePayPortalTrans(newTransaction.$id);  
                    return {  
                        return_code: 2,  
                        return_message: `Fail to generate ${payPortalName} QR code`,  
                        sub_return_code: -500,  
                        sub_return_message: "Transaction creation failed"  
                    };  
                }  
            } else {  
                return {  
                    return_code: 2,  
                    return_message: `Failed to create ${payPortalName} Transaction record`,  
                    sub_return_code: -500,  
                    sub_return_message: "Transaction creation failed"  
                };  
            }  
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
): Promise<CallbackResult> {  
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
            provider_trans_id: payPortalTransInfo.providerTransId,  
            payment_time: payPortalTransInfo.paymentTime,  
            error_message: payPortalTransInfo.errorMessage,  
            raw_callback: JSON.stringify(data)  
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
    result: CallbackResult  
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