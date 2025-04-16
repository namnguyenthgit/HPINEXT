import { NextRequest, NextResponse } from "next/server";  
import { processCallback, formatCallbackResponse } from "@/lib/actions/payportal.actions";
import { generateChecksum, validatePortalName } from "@/lib/utils";

type Props = {  
    params: {  
        portal: string  
    }  
}

export async function POST(request: NextRequest, context: Props) {  
    try {  
        const params = await context.params;  
        const portal = params.portal.toLowerCase();
        const validPortalName = validatePortalName(portal);
        const data = await request.json();  
        
        console.log(`Received ${validPortalName} callback:`, data);  
        
        // Process callback  
        const result = await processCallback(validPortalName, data);
        console.log(`${validPortalName} callback result:`, result)
        // Format and return response  
        return formatCallbackResponse(validPortalName, result);  

    } catch (error) {  
        console.error('Callback error:', error);  
        return NextResponse.json(  
            {   
                return_code: 2,   
                return_message: error instanceof Error   
                    ? error.message   
                    : "Internal server error"   
            },  
            { status: 500 }  
        );  
    }  
}  

export async function GET(request: NextRequest, context: Props) {  
    try {  
        // Validate and get portal parameter asynchronously  
        const params = await context.params;
        const portal = params.portal.toLowerCase();
        const validPortalName = validatePortalName(portal);
        const checksum = generateChecksum();
        //console.log('payportal-callback GET portal:',validPortalName);
        return NextResponse.json(  
            { message: `Test endpoint for ${validPortalName} callback, checksum: ${checksum}` },  
            { status: 200 }  
        );  
    } catch (error) {  
        return NextResponse.json(  
            { error: error instanceof Error ? error.message : "Invalid request" },  
            { status: 400 }  
        );  
    }  
}