import { NextRequest, NextResponse } from 'next/server';
import { encryptHmacSHA256 } from '@/lib/utils';
import { zaloConfig } from '@/lib/zalo/zalo.config';

async function createZaloPayOrder(email: string, lsDocumentNo: string, amount: string, timeRequest: string) {  
  const embed_data =  "{}";  
  const item = "[]";
   // Create date format yymmdd  
   const today = new Date();  
   const yy = today.getFullYear().toString().slice(-2);  
   const mm = String(today.getMonth() + 1).padStart(2, '0');  
   const dd = String(today.getDate()).padStart(2, '0');  
   const dateFormat = `${yy}${mm}${dd}`;
   
  const app_trans_id = `${dateFormat}_${timeRequest}_${lsDocumentNo}`; 
  const app_time = Date.now();  

  // Create order object with all values as strings  
  const order = {  
    app_id: zaloConfig.app_id,
    app_user: "HPI",
    app_trans_id,  
    app_time: app_time,  
    expire_duration_seconds: 900,  
    amount: parseInt(amount),  
    description: `Payment for order #${app_trans_id}`,  
    item,  
    embed_data,
    bank_code: "zalopayapp",  
    callback_url: zaloConfig.callback_url  
  };  

  // Create mac string using original number values where needed  
  const macString = [  
    zaloConfig.app_id,  
    order.app_trans_id,  
    order.app_user,  
    order.amount,  
    order.app_time,  
    order.embed_data,
    order.item  
  ].join('|');  
  //console.log('macString:',macString);
  
  const mac = encryptHmacSHA256(macString,zaloConfig.key1)  
  //console.log('mac:',mac);
  // Create final request body  
  const requestBody = new URLSearchParams();  
  Object.entries({  
    ...order,  
    mac  
  }).forEach(([key, value]) => {  
    requestBody.append(key, value.toString());  
  });

  console.log('createZaloPayOrder requestBody:', requestBody);
  const response = await fetch(zaloConfig.endpoints.create, {  
      method: 'POST',  
      headers: {  
          'Content-Type': 'application/x-www-form-urlencoded'  
      },  
      body: requestBody
  });
  const result = await response.json();
  //console.log('createZaloPayOrder function respond:',result)
  return result;  
}

export async function POST(req: NextRequest) {  
  try {
    const requestData = await req.json();  
    const { email, amount, lsDocumentNo, payPortalName } = requestData;
    
    //console.log('begin ZaloPay POST request, requestData:',requestData);
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

    //console.log('Get existing transaction, lsDocumentNo=',lsDocumentNo);
    const transaction = await getPayPortalTransByDocNo(lsDocumentNo);
    
    if (transaction) {
      //console.log('Check if transaction is already successful'); 
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

      //console.log('Check if transaction is still processing'); 
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

      //console.log('Update time_request and generate new QR');
      const newTimeRequest = (parseInt(transaction.time_request) + 1).toString();

      // Update transaction first  
      await updateTransaction({  
        documentId: transaction.$id,  
        data: {  
          time_request: newTimeRequest  
        }  
      });

      const result = await createZaloPayOrder(  
          email,   
          lsDocumentNo,   
          amount,   
          newTimeRequest
      );  

      //console.log('QR Code generated successfully');
      if (result.return_code === 1) {  
          return new NextResponse(  
              JSON.stringify({  
                  ...result,  
                  return_message: 'QR Code generated successfully',  
                  sub_return_message: 'Please proceed with payment',  
                  attempt: newTimeRequest
              }),  
              { status: 200 }  
          );  
      }  

      //console.log('QR Code generated fail');
      return new NextResponse(  
          JSON.stringify({  
              ...result,  
              attempt: newTimeRequest 
          }),  
          { status: 400 }  
      );
    } else {
      //console.log('DocNo transaction not found');
      const result = await createZaloPayOrder(email, lsDocumentNo, amount, '1');
      if (result.return_code === 1) {  
        //console.log('Create new transaction document');
        const transaction = await createTransaction({  
          email,  
          payPortalName,  
          amount,  
          lsDocumentNo,
          time_request: '1'
        });

        if (!transaction) {
          //console.log('Create new transaction document fail');
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
        
        //console.log('Create new transaction document successfully');
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
      } else {
        return new NextResponse(  
          JSON.stringify({  
            ...result,  
            attempt: '1'  
          }),  
          {   
            status: 400,  
            headers: {  
              'Content-Type': 'application/json',  
            },  
          }  
        );
      }
    }
  } catch (error) {  
    //console.error('ZaloPay API Error:', error);  
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