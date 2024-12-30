import { NextRequest, NextResponse } from "next/server";  
import { verifyCallback, processCallback, formatCallbackResponse } from "@/lib/actions/payportal.actions";  

interface RouteParams {  
    params: {  
        portal: string;  
    };  
}  

export async function POST(  
    req: NextRequest,  
    { params }: RouteParams  
) {  
    try {  
        const portal = params.portal.toLowerCase();  
        const data = await req.json();  
        
        // Log incoming callback  
        console.log(`Received ${portal} callback:`, data);  

        // Verify callback  
        const isValid = await verifyCallback(portal, data);  
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
        const result = await processCallback(portal, data);  

        // Return portal-specific response  
        return formatCallbackResponse(portal, result);  

    } catch (error) {  
        console.error(`${params.portal} callback error:`, error);  
        return NextResponse.json(  
            {   
                return_code: 2,   
                return_message: error instanceof Error ? error.message : "Internal server error"   
            },  
            { status: 500 }  
        );  
    }  
}