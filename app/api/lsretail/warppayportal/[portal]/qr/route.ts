import { NextRequest, NextResponse } from "next/server";  
import { processPayment } from "@/lib/actions/payportal.actions";  

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
           const { amount, billNumber, merchantName } = data;  

           // Validate required fields  
           if (!amount || !billNumber || !merchantName) {  
                return NextResponse.json({  
                    code: "21",  
                    message: "Missing required fields",  
                    data: null,  
                    url: null,  
                    checksum: null,  
                    isDelete: false,  
                    idQrcode: null  
                }, { status: 400 });  
            }  

            try {  
                // Validate and get the correct portal name  
                const validPortalName = validatePortalName(portal);  

                // Call processPayment with validated portal name  
                const paymentResult = await processPayment({  
                    email: merchantName,   
                    amount: amount.toString(),  
                    lsDocumentNo: billNumber,  
                    payPortalName: validPortalName,  
                    channel: "lsretail"   
                });  

                if (paymentResult.return_code === 1) {  
                    return NextResponse.json({  
                        code: "00",  
                        message: "Success",  
                        data: paymentResult.qr_code,  
                        url: null,  
                        checksum: null,  
                        isDelete: true,  
                        idQrcode: null  
                    }, { status: 200 });  
                } else {  
                    return NextResponse.json({  
                        code: "21",  
                        message: paymentResult.return_message || "Processing failed",  
                        data: null,  
                        url: null,  
                        checksum: null,  
                        isDelete: false,  
                        idQrcode: null  
                    }, { status: 200 });  
                }  
            } catch (error) {  
                console.error('Payment processing error:', error);  
                return NextResponse.json({  
                    code: "21",  
                    message: error instanceof Error ? error.message : "Processing failed",  
                    data: null,  
                    url: null,  
                    checksum: null,  
                    isDelete: false,  
                    idQrcode: null  
                }, { status: 500 });  
            }  
        }  
    } catch (error) {  
        console.error('Route error:', error);  
        return NextResponse.json({  
            code: "21",  
            message: error instanceof Error ? error.message : "Internal server error",  
            data: null,  
            url: null,  
            checksum: null,  
            isDelete: false,  
            idQrcode: null  
        }, { status: 500 });  
    }  
}