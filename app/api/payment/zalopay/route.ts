// app/api/payment/zalopay/route.ts  
import { NextRequest, NextResponse } from 'next/server';  
import CryptoJS from 'crypto-js';   

const config = {  
  app_id: 4068,  
  key1: "81Zbv2d38uBNpk5YvrnKgKnZsMrhk5yb",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create"  
};  

function getCurrentTimeString(format: string): string {  
  const date = new Date();  
  // Adjust to GMT+7  
  //date.setHours(date.getHours() + 7);  
  
  // Format yyMMdd  
  const year = date.getFullYear().toString().slice(-2);  
  const month = (date.getMonth() + 1).toString().padStart(2, '0');  
  const day = date.getDate().toString().padStart(2, '0');  
  
  return `${year}${month}${day}`;  
} 

function hmacEncrypt(key: string, data: string): string { 
  return CryptoJS.HmacSHA256(data,key).toString();
}  

export async function POST(req: NextRequest) {  
  try {  
    const requestData = await req.json();  

    if (!requestData.amount) {  
      return new NextResponse(  
        JSON.stringify({   
          return_code: 2,  
          return_message: "Invalid Request",  
          sub_return_code: -400,  
          sub_return_message: "Missing amount"  
        }),   
        { status: 400 }  
      );  
    }  

    const embed_data = "{}";  
    const item = "[]";  
    const app_trans_id = `${getCurrentTimeString("yyMMdd")}_${requestData.lsDocumentNo}`;  

    // Create order data  
    const order = {  
      app_id: 4068,  
      app_user: "HPI",
      app_trans_id,
      app_time: Date.now(),
      expire_duration_seconds: 900,
      amount: parseInt(requestData.amount),
      description: `ZaloPayTest - Thanh toán cho đơn hàng #${app_trans_id}`, 
      item,  
      embed_data,
      bank_code: "zalopayapp",
    };  

    // Generate MAC string exactly as in Java sample  
    const macString = [  
      order.app_id,  
      order.app_trans_id,  
      order.app_user,  
      order.amount,  
      order.app_time,  
      order.embed_data,  
      order.item  
    ].join('|');  

    console.log('MAC String:', macString);  

    // Generate MAC  
    const mac = hmacEncrypt(config.key1,macString);  

    // Create final request body  
    const requestBody = new URLSearchParams();  
    Object.entries({  
      ...order,  
      mac  
    }).forEach(([key, value]) => {  
      requestBody.append(key, value.toString());  
    });  

    console.log('Request Body:', Object.fromEntries(requestBody));  

    // Make request to ZaloPay  
    const zaloPayResponse = await fetch(config.endpoint, {  
      method: 'POST',  
      headers: {  
        'Content-Type': 'application/x-www-form-urlencoded',  
      },  
      body: requestBody,  
    });  

    const result = await zaloPayResponse.json();  
    console.log('ZaloPay Response:', result);  

    return new NextResponse(JSON.stringify(result), {  
      status: result.return_code === 1 ? 200 : 400,  
      headers: {  
        'Content-Type': 'application/json',  
      },  
    });  

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