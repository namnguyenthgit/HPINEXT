// app/api/lsretail/getdata/[gettype]/route.ts  
import { appConfig } from "@/lib/appconfig";
import { NextRequest, NextResponse } from "next/server"; 

type Props = {  
    params: {  
        gettype: string  
    }  
}

export async function GET(request: NextRequest, context: Props) {  
    try {  
        const params = await context.params;
        const gettype = await params.gettype;
        const searchParams = request.nextUrl.searchParams;
        //console.log('searchParams:',searchParams);
        let apiEndpoint = '';  
        let queryParams = '';  
        const value = searchParams.get('value');
        //console.log('searchParams value:',searchParams);  
        if (!value) {  
            return NextResponse.json(  
                { success: false, message: 'Value parameter is required' },  
                { status: 400 }  
            );  
        }  
        queryParams = `?value=${encodeURIComponent(value)}`;
        // Handle different gettype cases  
        switch (gettype) {  
            case 'postransline':
                apiEndpoint = 'api/hpi/get/trans_pos_line';  
                break;  
            case 'postrans':  
                // Add any specific parameters for document list if needed  
                apiEndpoint = 'api/hpi/get/trans_pos';  
                break;  

            // Add more cases as needed  
            default:  
                return NextResponse.json(  
                    { success: false, message: 'Invalid gettype parameter' },  
                    { status: 400 }  
                );  
        }  

        const url = new URL(  
            `${apiEndpoint}${queryParams}`,  
            appConfig.lsretail_baseurl.replace(/\/$/, '')  
        ).toString();

        const response = await fetch(url,  
            {  
                method: 'GET',  
                headers: {  
                    'Authorization': appConfig.lsretail_basetoken,
                    'Accept': 'application/json',  
                    'Content-Type': 'application/json',
                }  
            }  
        );  

        if (!response.ok) {  
            throw new Error(`API error: ${response.statusText}`);  
        }  

        if (!response.ok) {  
            const errorMessage = `API error: ${response.status} ${response.statusText}`;  
            console.error(errorMessage);  
            return NextResponse.json({  
                success: false,  
                message: errorMessage  
            }, { status: response.status });  
        }

        const data = await response.json();  
        return NextResponse.json({  
            success: true,  
            data: data  
        });

    } catch (error) {  
        console.error(`Error in ${context.params.gettype} API:`, error);  
        return NextResponse.json({  
            success: false,  
            message: error instanceof Error ? error.message : 'Failed to fetch data'  
        }, { status: 500 });  
    }  
}