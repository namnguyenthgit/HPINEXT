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
        
        // Log incoming callback  
        console.log(`Received ${portal} callback:`, data);  

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

export async function GET(request: NextRequest, context: Props) {  
    try {  
        // Validate and get portal parameter asynchronously  
        const params = await context.params;
        const portal = params.portal;  
        //console.log('payportal-callback GET portal:',portal);
        return NextResponse.json(  
            { message: `Test endpoint for ${portal} callback` },  
            { status: 200 }  
        );  
    } catch (error) {  
        return NextResponse.json(  
            { error: error instanceof Error ? error.message : "Invalid request" },  
            { status: 400 }  
        );  
    }  
}