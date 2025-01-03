import { NextRequest, NextResponse } from "next/server";  
import { verifyCallback, processCallback, formatCallbackResponse } from "@/lib/actions/payportal.actions";  

type Props = {  
    params: {  
        portal: string  
    }  
}

export async function POST(request: NextRequest, context: Props) {  
    try {  
        // Validate and get portal parameter asynchronously
        const params = await context.params;
        const portal = params.portal; 
        const data = await request.json();  
        const isTestMode = portal.toLowerCase().includes('test');

        // Log incoming callback
        console.log(`Received ${request} context:`, context);
        console.log(`Received ${request} callback:`, request);
        console.log(`Received ${portal} callback:`, data);  

        if (isTestMode){
            // Get all headers  
            const headers: Record<string, string> = {};  
            request.headers.forEach((value, key) => {  
                headers[key] = value;  
            });

             // Get URL and query parameters  
            const url = request.url;  
            const searchParams = Object.fromEntries(request.nextUrl.searchParams); 
            return NextResponse.json(  
                {   
                    message: `${portal} test mode - showing full request details`,  
                    request: {  
                        method: request.method,  
                        url,  
                        headers,  
                        queryParams: searchParams,  
                        body: data,  
                        timestamp: new Date().toISOString(),
                    }  
                },  
                { status: 200 }  
            );

        } else {
            // Verify callback  
            const isValid = await verifyCallback(portal.toLowerCase(), data);  
            if (!isValid) {  
                return NextResponse.json(  
                    {   
                        return_code: 2,   
                        return_message: `Invalid ${portal} callback data`   
                    },  
                    { status: 400 }  
                );  
            }  

            // Process callback  
            const result = await processCallback(portal.toLowerCase(), data);  

            // Return portal-specific response  
            return formatCallbackResponse(portal.toLowerCase(), result); 
        }
    } catch (error) {  
        console.error('Callback error:', error);  
        return NextResponse.json(  
            {   
                return_code: 2,   
                return_message: error instanceof Error ? error.message : "Internal server error"   
            },  
            { status: 500 }  
        );  
    }  
}  

// export async function GET(request: NextRequest, context: Props) {  
//     try {  
//         // Validate and get portal parameter asynchronously
//         const params = await context.params;  
//         const portal = params.portal;

//         // Get all headers  
//         const headers: Record<string, string> = {};  
//         request.headers.forEach((value, key) => {  
//             headers[key] = value;  
//         });  
        
//         // Get URL and query parameters  
//         const url = request.url;  
//         const searchParams = Object.fromEntries(request.nextUrl.searchParams);

//         // Get request body  
//         let bodyData = null;  
//         const clonedRequest = request.clone();  
//         try {  
//              // First get the raw text  
//             const rawBody = await clonedRequest.text();  
//             console.log('Raw body:', rawBody);  

//             // Only try to parse if we have content  
//             if (rawBody && rawBody.trim() !== '') {  
//                 try {  
//                     bodyData = JSON.parse(rawBody);  
//                     console.log('Parsed body:', bodyData);  
//                 } catch (parseError) {  
//                     console.log('JSON parse error:', parseError);  
//                     bodyData = rawBody; // Keep raw text if parsing fails  
//                 }  
//             }  
//         } catch (e) {  
//              console.log('Error reading body:', e);  
//         }

//         return NextResponse.json(  
//             {   
//                 message: `${portal} for lsretail api is running`,  
//                 request: {  
//                     method: request.method,  
//                     url,  
//                     headers,  
//                     queryParams: searchParams,
//                     body: bodyData
//                 }  
//             },  
//             { status: 200 }  
//         );  
//     } catch (error) {  
//         return NextResponse.json(  
//             { error: error instanceof Error ? error.message : "Invalid request" },  
//             { status: 400 }  
//         );  
//     }  
// }