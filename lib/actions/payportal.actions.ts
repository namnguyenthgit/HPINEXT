'use server'  

import { createZalopayOrder, queryZalopayOrder } from './zalopay.actions';  
import { zaloConfig, ZaloPayResponse } from "../zalo/zalo.config";
import { NextResponse } from 'next/server';
import { appConfig} from '../appconfig';
import { createPayPortalTrans, getPayPortalTransByDocNo, getPPTransByColumnName, updatePayPortalTrans } from './payportaltrans.actions';
import { generateUniqueString, parseStringify, verifyHmacSHA256 } from '../utils';
import { lsApiDocReturn, ParsedPPTCallbackDataAccept, PayPortalCallbackResult, RawCallbackData } from '@/types';
import { payWithGalaxyQR, queryGalaxyPayOrder } from './galaxypay.actions';

// Common types for all payment portals  
export interface PaymentRequest {  
    email: string;  
    amount: string;  
    lsDocumentNo: string;  
    payPortalName: "vnpay" | "zalopay" | "ocbpay" | "galaxypay";
    channel: string;
    terminalId: string;
    embed_data: string;
}

interface PaymentQuery {  
    documentNo: string;  
    portalName: string;
} 

export interface PaymentResponse extends ZaloPayResponse {  
    payPortalOrder?: string;
    order_url?: string;
    qr_code?: string;

}


// Helper function to check existing ZaloPay payment  
// async function checkExistingZaloPayment(  
//     app_trans_id: string | undefined  
// ): Promise<ZaloPayResponse | null> {  
//     if (!app_trans_id) {  
//         return null;  
//     }   
    
//     try {  
//         const queryResult = await queryZalopayOrder(app_trans_id);  
//         return queryResult;  
//     } catch (error) {  
//         console.error(`Error querying ZaloPay order "${app_trans_id}":`, error);  
//         return null;  
//     }  
// }

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
        //Try to get existing transaction  
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
        if (paymentStatus.return_code === 1 && existingPayportalTrans.status !== 'success') {  
            // Payment successful  
            await safeUpdatePayPortalTrans(  
                existingPayportalTrans.$id,  
                {  
                    status: 'success', 
                }  
            );  
        } else if (paymentStatus.return_code === 3 && existingPayportalTrans.status !== 'processing') {  
            
            // Payment processing  
            await safeUpdatePayPortalTrans(  
                existingPayportalTrans.$id,  
                {  
                    status: 'processing',
                }  
            );  
        
        } else if (paymentStatus.return_code !== 1 && paymentStatus.return_code !== 3 && existingPayportalTrans.status !== 'failed') {  
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
    const { email, amount, lsDocumentNo, payPortalName, channel, terminalId, embed_data } = paymentRequest;  

    if (!amount || !email || !lsDocumentNo || !payPortalName || !channel || !terminalId) {  
        return {  
            return_code: 2,  
            return_message: "Invalid Request",  
            sub_return_code: -400,  
            sub_return_message: "Missing required fields"  
        };  
    }

    try {
        let existingPayportalTrans = null;
        
        try {
            existingPayportalTrans = await getPayPortalTransByDocNo(lsDocumentNo);
        } catch (error) {
            console.error(`Error "${error}" while fetching PayPortalTrans, system will let generate QR only!`);
            // If getPayPortalTransByDocNo fails, proceed with new payment processing  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount,  
                terminalId,
                embed_data
            );  

            if (result.return_code === 1 && result.payPortalOrder) {  
                try {  
                    const newTransaction = await createPayPortalTrans({  
                        email,  
                        payPortalName,  
                        channel,  
                        terminalId,  
                        amount,  
                        lsDocumentNo,  
                        payPortalOrder: result.payPortalOrder,  
                        payPortalPaymentUrl: String(result.order_url),  
                        payPortalQRCode: String(result.qr_code),  
                    });  

                    if (!newTransaction && channel !== 'lsretail') {  
                        return {  
                            return_code: 2,  
                            return_message: "Update Failed",  
                            sub_return_message: "Failed to update new transaction with payment order"  
                        };  
                    }  
                } catch (createError) {  
                    // If createPayPortalTrans fails, still return the payment result  
                    console.error('Error creating PayPortalTrans:', createError);  
                }  
            }  

            return result;
        }
        
        if (existingPayportalTrans && existingPayportalTrans.payPortalOrder) {  
            const existingPayment = await checkExistingPaymentStatus(
                existingPayportalTrans.payPortalName,
                existingPayportalTrans.payPortalOrder
            );  
            console.log("processPayment-existingPayment:",existingPayment);
            if (existingPayment) {  
                // Case 1: Payment is successful => if order create same amount: update payPortalTrans.status to success otherwise raise error
                if (existingPayment.return_code === 1) {
                    if (parseInt(amount) != existingPayment.amount){
                        return {  
                            return_code: 2,  
                            return_message: "Update payPortalTrans Failed",  
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
                            return_message: "Update payPortalTrans Failed",  
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
            //console.log(`Generating new QR for payment ${existingPayportalTrans.payPortalOrder}`);  
            const result = await processPaymentByPortal(  
                payPortalName,  
                email,  
                lsDocumentNo,  
                amount,
                terminalId,
                embed_data
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
                amount,
                terminalId,
                embed_data
            );

            if (result.return_code === 1 && result.payPortalOrder) {
                const newTransaction = await createPayPortalTrans({  
                    email,  
                    payPortalName,
                    channel,
                    terminalId,
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
    amount: string,
    terminalId: string,
    embed_data: string,
    item?: string
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
            const app_trans_id = `${dateFormat}_${terminalId}_${uniqueString}_${lsDocumentNo}`;
            const zaloResponse = await createZalopayOrder({  
                app_trans_id,  
                app_user: email,
                amount,  
                description: `Hoang Phuc International - Payment for order #${app_trans_id}`,
                embed_data,
                item,
            });

            return {  
                ...zaloResponse,  
                payPortalOrder: app_trans_id  
            };
        
        case 'galaxypay':
            const galaxypayResponse = await payWithGalaxyQR({
                orderNumber:lsDocumentNo,
                orderAmount:amount,
                orderDescription:lsDocumentNo,
            });
            
            return {
                return_code: galaxypayResponse.responseCode === 200 ? 1 : galaxypayResponse.responseCode,
                return_message: galaxypayResponse.responseMessage,
                payPortalOrder: galaxypayResponse.transactionID,
                order_url:galaxypayResponse.endpoint,
                qr_code:galaxypayResponse.qrCode,
                ...galaxypayResponse
            }
        default:  
            throw new Error(`Unsupported payment portal: ${portalName}`);  
    }  
}

//callback
export async function validateCallback(
    portal: string,
    rawdata:RawCallbackData
): Promise<boolean> {
    switch (portal) {
        case 'zalopay':
            return verifyHmacSHA256(parseStringify(rawdata.data),zaloConfig.key2,parseStringify(rawdata.mac));
        default:
            return false
    }
}

export async function parseCallbackData(  
    portal: string,  
    rawdata: RawCallbackData  
): Promise<ParsedPPTCallbackDataAccept> {
    try {
        switch (portal) {  
            case 'zalopay':
                const parsedCallbackData = JSON.parse(rawdata.data);
                return {  
                    parsedData : {  
                        payPortalOrder: parsedCallbackData.app_trans_id,  
                        callbackProviderTransId: parsedCallbackData.zp_trans_id,  
                        callbackPaymentTime: parsedCallbackData.server_time,  
                        callbackamount: parsedCallbackData.amount,  
                        rawCallback: rawdata.data
                    }
                }
            default:  
                return {  
                    parsedData: null,  
                    error: `Unsupported payment portal: ${portal}`  
                };  
        }
    } catch (error) {
        return {  
            parsedData: null,  
            error: `Can not parse ${portal} callbackdata error:"${error}`
        };
    }
     
} 

export async function processCallback(  
    portal: string,   
    data: RawCallbackData  
): Promise<PayPortalCallbackResult> {
    if (!validateCallback(portal, data)) {
        return {
            success: false,
            message: `${portal} Callbackdata is invalid`
        }
    }
    
    try {
        const parsedCallbackData = await parseCallbackData(portal,data);
        if (!parsedCallbackData.parsedData){
            return {
                success: false,
                message: parsedCallbackData.error || 'unknow error'
            }
        }
        const callbackDataProccess = parsedCallbackData.parsedData;
        let callbackInternalCheckErr: string | undefined;
        const payment_time = new Date(callbackDataProccess.callbackPaymentTime).toISOString();
        const payPortalTrans = await getPPTransByColumnName('payPortalOrder', callbackDataProccess.payPortalOrder);

        if (!payPortalTrans) {
            callbackInternalCheckErr = `${portal} Callback Order ${callbackDataProccess.payPortalOrder} do not exsits in PayPortalTrans!!!`
    
        } else {
            console.log("callbackDataProccess:",callbackDataProccess);
            const requestAmount = Number(payPortalTrans.amount);  
            const callbackAmount = Number(callbackDataProccess.callbackamount);
            if(requestAmount != callbackAmount){
                callbackInternalCheckErr = `${portal} Callback amount "${callbackAmount}" do not match with request:"${requestAmount}"`;
            }
        }
        const updateSuccess = await safeUpdatePayPortalTrans(  
            payPortalTrans.$id,  
            {  
                status: callbackInternalCheckErr? 'failed': 'success',
                callbackProviderTransId: String(callbackDataProccess.callbackProviderTransId) || '',  
                callbackPaymentTime: payment_time,
                callbackErrorMessage: callbackInternalCheckErr || '',
                rawCallback: JSON.stringify(callbackDataProccess.rawCallback) || ''
            }  
        );  

        if (!updateSuccess) {  
            return {  
                success: false,  
                message: `Failed to update payPortalTrans: ${payPortalTrans.$id}`  
            };  
        }
        
        return {  
            success: callbackInternalCheckErr ? false : true,  
            message: callbackInternalCheckErr ? callbackInternalCheckErr : 'success'
        }; 
    } catch (error) {  
        return {  
            success: false,  
            message: error instanceof Error ? error.message : 'Unknown error occurred'  
        };  
    }
} 

export async function formatCallbackResponse(  
    portal: string,   
    result: PayPortalCallbackResult  
): Promise<NextResponse> {  
    switch (portal) {  
        case 'zalopay':  
            return NextResponse.json({  
                return_code: result.success ? 1 : 2,  
                return_message: result.success ? "success" : result.message,  
            });  
        
        // Add other portal response formats here  
        
        default:  
            return NextResponse.json({  
                success: result.success,  
                message: result.success ? "success" : result.message,
            });  
    }  
}  
// Rename and modify the helper function to check existing payments
async function checkExistingPaymentStatus(
    payPortalName: string,
    app_trans_id: string | undefined
): Promise<PaymentResponse | null> {
    if (!app_trans_id) {
        return null;
    }

    try {
        switch (payPortalName.toLowerCase()) {
            case 'zalopay':
                return await queryZalopayOrder(app_trans_id);
            case 'galaxypay':
                return await queryGalaxyPayOrder(app_trans_id);
            default:
                console.error(`Unsupported payment portal: ${payPortalName}`);
                return null;
        }
    } catch (error) {
        console.error(`Error querying ${payPortalName} order "${app_trans_id}":`, error);
        return null;
    }
}  