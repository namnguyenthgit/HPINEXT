import { NextRequest, NextResponse } from "next/server";  
import { queryPayment } from "@/lib/actions/payportal.actions";  

type Props = {  
    params: {  
        portal: string  
    }  
}  

// Type for valid payment portals  
type ValidPayPortal = "vnpay" | "zalopay" | "ocbpay" | "galaxypay";  

// Function to validate and map portal names  
function validatePortalName(portal: string): ValidPayPortal {  
    // Convert to lowercase and remove any test suffix  
    const normalizedPortal = portal.toLowerCase().replace('test', '');  
    
    switch (normalizedPortal) {  
        case 'vnpay':  
            return 'vnpay';  
        case 'zalopay':  
            return 'zalopay';  
        case 'ocbpay':  
        case 'ocb':  
            return 'ocbpay';  
        case 'galaxypay':  
            return 'galaxypay';  
        default:  
            throw new Error(`Invalid payment portal: ${portal}`);  
    }  
}  

export async function POST(request: NextRequest, context: Props) {  
    try {  
        const params = await context.params;  
        const portal = params.portal;   
        const data = await request.json();  
        const isTestMode = portal.toLowerCase().includes('test');  

        if (isTestMode){  
            const headers: Record<string, string> = {};  
            request.headers.forEach((value, key) => {  
                headers[key] = value;  
            });  
            const url = request.url;  
            const searchParams = Object.fromEntries(request.nextUrl.searchParams);   
            const respond_test = {   
                message: `${portal} test mode - showing full request details`,  
                request: {  
                    method: request.method,  
                    url,  
                    headers,  
                    queryParams: searchParams,  
                    body: data,  
                    timestamp: new Date().toISOString(),  
                }  
            }  
            return NextResponse.json(respond_test, { status: 200 });  
        } else {  
           const { txnId } = data;  

           // Validate required fields  
           if (!txnId ) {  
                return NextResponse.json({  
                    code: "01",  
                    message: "Missing required fields",  
                    checksum: null,
                }, { status: 200 });  
            }  

            try {  
                // Validate and get the correct portal name  
                const validPortalName = validatePortalName(portal);  

                // Call processPayment with validated portal name  
                const paymentResult = await queryPayment({  
                    documentNo: txnId,
                    portalName: validPortalName
                });  

                if (paymentResult.return_code === 1) {  
                    return NextResponse.json({  
                        code: "00",  
                        message: `${portal} Payment sucessful`,  
                        masterMerchantCode: null,
                        merchantCode: null,
                        terminalID: null,
                        billNumber: txnId,
                        txnId: txnId,
                        payDate: null,
                        qrTrace: null,
                        bankCode: null,
                        debitAmount: String(paymentResult.amount),
                        realAmount: String(paymentResult.amount),
                        checkSum: "DD53EDEC17464AEBA2277B0AC52A1B02" 
                    }, { status: 200 });  
                } else {  
                    return NextResponse.json({  
                        code: "21",  
                        message: paymentResult.return_message || "Processing failed",  
                        checksum: null
                    }, { status: 200 });  
                }  
            } catch (error) {  
                console.error('Payment processing error:', error);  
                return NextResponse.json({  
                    code: "21",  
                    message: error instanceof Error ? error.message : "Processing failed",  
                    checksum: null 
                }, { status: 500 });  
            }  
        }  
    } catch (error) {  
        console.error('Route error:', error);  
        return NextResponse.json({  
            code: "21",  
            message: error instanceof Error ? error.message : "Internal server error",  
            checksum: null 
        }, { status: 500 });  
    }  
}