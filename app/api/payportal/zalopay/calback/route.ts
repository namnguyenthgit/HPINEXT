// app/api/payportal/zalopay/callback/route.ts  
import { NextRequest, NextResponse } from 'next/server';  

export async function POST(req: NextRequest) {  
  try {  
    // Get the callback data from ZaloPay  
    const callbackData = await req.json();  
    
    // Log the full callback data to see what ZaloPay sends  
    console.log('ZaloPay Callback Data:', JSON.stringify(callbackData, null, 2));  

    // Return success response to ZaloPay  
    return new NextResponse(  
      JSON.stringify({  
        return_code: 1,  
        return_message: "Success"  
      }),  
      {   
        status: 200,  
        headers: {  
          'Content-Type': 'application/json'  
        }  
      }  
    );  

  } catch (error) {  
    console.error('Callback Error:', error);  
    return new NextResponse(  
      JSON.stringify({  
        return_code: 2,  
        return_message: "Server Error",  
        sub_return_message: error instanceof Error ? error.message : 'Unknown error occurred'  
      }),  
      { status: 500 }  
    );  
  }  
}