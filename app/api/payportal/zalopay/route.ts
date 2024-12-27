// app/api/payment/zalopay/route.ts  
import { NextRequest, NextResponse } from 'next/server';  
import CryptoJS from 'crypto-js';   
import { createTransaction, getTransactionsByDocNo } from '@/lib/actions/transaction.actions';
import { databases } from '@/lib/appwrite-client';
import { appwriteConfig } from '@/lib/appwrite-config';

const DATABASE_ID = appwriteConfig.databaseId
const TRANSACTION_COLLECTION_ID = appwriteConfig.transactionCollectionId

const config = {  
  app_id: 4068,  
  key1: "81Zbv2d38uBNpk5YvrnKgKnZsMrhk5yb",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
  callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/payportal/zalopay/callback`
};  

async function updateTimeRequest(documentId: string, currentCount: string) {  
  try {  
      await databases.updateDocument(  
          DATABASE_ID!,  
          TRANSACTION_COLLECTION_ID!,  
          documentId,  
          {  
            time_request: (parseInt(currentCount) + 1).toString()
          }  
      );  
  } catch (error) {  
      console.error('Error updating time_request:', error);  
      throw error;  
  }  
}

async function createZaloPayOrder(email: string, lsDocumentNo: string, amount: string, timeRequest: string) {  
  const embed_data = JSON.stringify({ email });  
  const item = "[]";  
  const app_trans_id = `${timeRequest}_${lsDocumentNo}`;  
  const app_time = Date.now();  

  // Create order object with all values as strings  
  const order = {  
      app_id: config.app_id,  
      app_user: "HPI",  
      app_trans_id,  
      app_time: app_time,  
      expire_duration_seconds: "900",  
      amount: parseInt(amount),  
      description: `Payment for order #${app_trans_id}`,  
      item,  
      embed_data,  
      bank_code: "zalopayapp",  
      callback_url: config.callback_url  
  };  

  // Create mac string using original number values where needed  
  const macString = [  
      config.app_id,  
      order.app_trans_id,  
      order.app_user,  
      parseInt(amount),  
      app_time,  
      embed_data,
      item  
  ].join('|');  

  const mac = CryptoJS.HmacSHA256(macString, config.key1).toString();  

  // Create final request body  
  const requestBody = new URLSearchParams();  
  Object.entries({  
    ...order,  
    mac  
  }).forEach(([key, value]) => {  
    requestBody.append(key, value.toString());  
  });

  console.log('createZaloPayOrder requestBody:', requestBody);
  const response = await fetch(config.endpoint, {  
      method: 'POST',  
      headers: {  
          'Content-Type': 'application/x-www-form-urlencoded'  
      },  
      body: requestBody
  });
  const result = await response.json();
  console.log('createZaloPayOrder function respond:',result)
  return result;  
}
export async function POST(req: NextRequest) {  
  try {
    const requestData = await req.json();  
    const { email, amount, lsDocumentNo, payPortalName } = requestData;
    console.log('begin ZaloPay POST request, requestData:',requestData);
    if (!amount || !email || !lsDocumentNo || !payPortalName) {  
      return new NextResponse(  
        JSON.stringify({  
          return_code: 2,  
          return_message: "Invalid Request",  
          sub_return_code: -400,  
          sub_return_message: "Missing required fields"  
        }),  
        { status: 400 }  
      );  
    }

    console.log('Get existing transaction, lsDocumentNo=',lsDocumentNo);
    const transaction = await getTransactionsByDocNo(lsDocumentNo);
    
    if (transaction) {
      console.log('Check if transaction is already successful'); 
      if (transaction.status === 'success') {  
        return new NextResponse(  
            JSON.stringify({  
                return_code: 2,  
                return_message: "Payment Already Processed",  
                sub_return_message: "This document has already been paid successfully"  
            }),  
            { status: 400 }  
        );     
      }

      console.log('Check if transaction is still processing'); 
      if (transaction.status !== 'processing') {  
        return new NextResponse(  
            JSON.stringify({  
                return_code: 2,  
                return_message: "Invalid Transaction State",  
                sub_return_message: "Transaction is not in processing state"  
            }),  
            { status: 400 }  
        );  
      }

      console.log('Update time_request and generate new QR');
      await updateTimeRequest(transaction.$id, transaction.time_request);  
      const result = await createZaloPayOrder(  
          email,   
          lsDocumentNo,   
          amount,   
          (parseInt(transaction.time_request) + 1).toString()  
      );  

      console.log('QR Code generated successfully');
      if (result.return_code === 1) {  
          return new NextResponse(  
              JSON.stringify({  
                  ...result,  
                  return_message: 'QR Code generated successfully',  
                  sub_return_message: 'Please proceed with payment',  
                  attempt: (parseInt(transaction.time_request) + 1).toString() 
              }),  
              { status: 200 }  
          );  
      }  

      console.log('QR Code generated fail');
      return new NextResponse(  
          JSON.stringify({  
              ...result,  
              attempt: (parseInt(transaction.time_request) + 1).toString()  
          }),  
          { status: 400 }  
      );
    } else {
      console.log('DocNo transaction not found');
      const result = await createZaloPayOrder(email, lsDocumentNo, amount, '1');
      if (result.return_code === 1) {  
        console.log('Create new transaction document');
        const transaction = await createTransaction({  
          email,  
          payPortalName,  
          amount,  
          lsDocumentNo,
          time_request: '1'
        });

        if (!transaction) {
          console.log('Create new transaction document fail');
          return new NextResponse(  
            JSON.stringify({  
              return_code: 2,  
              return_message: "Failed to create transaction record",  
              sub_return_code: -500,  
              sub_return_message: "Transaction creation failed"  
            }),  
            { status: 500 }  
          );  
        }  
        
        console.log('Create new transaction document successfully');
        return new NextResponse(  
          JSON.stringify({  
            ...result,  
            return_message: 'QR Code generated successfully',  
            sub_return_message: 'Please proceed with payment',  
            attempt: '1'  
          }),  
          {  
            status: 200,  
            headers: {  
              'Content-Type': 'application/json',  
            },  
          }  
        );
      }
    }
  } catch (error) {  
    console.error('ZaloPay API Error:', error);  
    return new NextResponse(  
      JSON.stringify({   
        return_code: 2,  
        return_message: "Server Error",  
        sub_return_code: -500,  
        sub_return_message: error instanceof Error ? error.message : 'Unknown error occurred'  
      }),   
      { status: 500 }  
    );  
  }  
}