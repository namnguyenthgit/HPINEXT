import { NextRequest, NextResponse } from "next/server";  
import {  
    verifyCallback,  
    processCallback,  
    formatCallbackResponse,  
} from "@/lib/actions/payportal.actions";  
import { isValidPortal } from "@/lib/appconfig";  
import type {  
    RawZaloPayCallback,   
    ZaloPayCallbackData,  
    ParsedZaloPayData   
} from "@/types";  

interface RouteContext {  
    params: {  
        portal: string;  
    };  
}  

interface ErrorResponse {  
    return_code: number;  
    return_message: string;  
}  

// Type guard for RawZaloPayCallback  
function isRawZaloPayCallback(data: unknown): data is RawZaloPayCallback {  
    if (!data || typeof data !== 'object') return false;  
    const d = data as Record<string, unknown>;  
    return (  
        typeof d.data === 'string' &&  
        typeof d.mac === 'string' &&  
        typeof d.type === 'number'  
    );  
}  

// Type guard for ZaloPayCallbackData  
function isZaloPayCallbackData(data: unknown): data is ZaloPayCallbackData {  
    if (!data || typeof data !== 'object') return false;  
    const d = data as Record<string, unknown>;  
    return (  
        typeof d.app_trans_id === 'string' &&  
        typeof d.app_time === 'number' &&  
        typeof d.amount === 'number'  
        // Add more specific checks as needed  
    );  
}  

// Helper function to parse raw callback data  
function parseRawCallbackData(rawData: RawZaloPayCallback): ZaloPayCallbackData {  
    try {  
        const parsedData = JSON.parse(rawData.data) as ParsedZaloPayData;  
        return {  
            ...parsedData,  
            status: rawData.type === 1 ? 1 : 0,  
            mac: rawData.mac  
        };  
    } catch (error) {  
        throw new Error('Failed to parse raw callback data: ' +   
            (error instanceof Error ? error.message : 'Unknown error'));  
    }  
}  

// Helper function to validate and transform callback data  
function validateCallbackData(data: unknown): ZaloPayCallbackData {  
    if (isRawZaloPayCallback(data)) {  
        return parseRawCallbackData(data);  
    }  
    
    if (isZaloPayCallbackData(data)) {  
        return data;  
    }  
    
    throw new Error('Invalid callback data format');  
}  

function createErrorResponse(  
    message: string,  
    status: number = 400  
): NextResponse<ErrorResponse> {  
    return NextResponse.json(  
        {  
            return_code: 2,  
            return_message: message  
        },  
        { status }  
    );  
}  

export async function POST(  
    request: NextRequest,  
    context: RouteContext  
): Promise<NextResponse> {  
    try {  
        const portal = context.params.portal.toLowerCase();  

        if (!isValidPortal(portal)) {  
            return createErrorResponse(`Invalid payment portal: ${portal}`);  
        }  

        // Parse request data  
        const rawData = await request.json();  
        console.log(`Received ${portal} callback:`, JSON.stringify(rawData, null, 2));  

        try {  
            // Validate and transform the data  
            const validatedData = validateCallbackData(rawData);  

            // Verify callback  
            const isValid = await verifyCallback(portal, validatedData);  
            if (!isValid) {  
                return createErrorResponse(`Invalid ${portal} callback data signature`);  
            }  

            // Process callback  
            const result = await processCallback(portal, validatedData);  

            // Return portal-specific response  
            return formatCallbackResponse(portal, result);  

        } catch (processError) {  
            console.error('Processing error:', processError);  
            return createErrorResponse(  
                processError instanceof Error  
                    ? processError.message  
                    : 'Payment processing error',  
                400  
            );  
        }  

    } catch (error) {  
        console.error('Callback error:', error);  
        return createErrorResponse(  
            error instanceof Error  
                ? error.message  
                : 'Internal server error',  
            500  
        );  
    }  
} 

export async function GET(  
    request: NextRequest,  
    context: RouteContext  
): Promise<NextResponse> {  
    try {  
        const portal = context.params.portal.toLowerCase();  

        if (!isValidPortal(portal)) {  
            return NextResponse.json(  
                { error: `Invalid payment portal: ${portal}` },  
                { status: 400 }  
            );  
        }  

        return NextResponse.json(  
            { message: `${portal} callback is running!` },  
            { status: 200 }  
        );  

    } catch (error) {  
        return NextResponse.json(  
            {  
                error: error instanceof Error  
                    ? error.message  
                    : "Internal server error"  
            },  
            { status: 500 }  
        );  
    }  
}