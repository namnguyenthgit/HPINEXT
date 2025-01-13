import { LSRetailDocumentResponse, LSRetailResponse, LSRetailTransactionResponse } from "@/types";

// Base function to fetch data through our Next.js API route  
async function fetchLSRetailData<T>(  
    gettype: 'postransline' | 'postrans',  
    value: string  
): Promise<LSRetailResponse<T>> {  
    try {  
        // Use the existing API route instead of direct outbound API call  
        const response = await fetch(  
            `/api/lsretail/getdata/${gettype}?value=${encodeURIComponent(value)}`  
        );  
        //console.log(`fetchLSRetailData-${gettype}:${response}`);
        if (!response.ok) {  
            throw new Error(`API error: ${response.status} ${response.statusText}`);  
        }  

        const result = await response.json();
        if (!result.success) {  
            throw new Error(result.message || 'Failed to fetch data');  
        }  

        return result;
    } catch (error) {  
        console.error('LS Retail API Error:', error);  
        return {  
            success: false,
            message: error instanceof Error ? error.message : 'Failed to fetch data'  
        };  
    }  
}  

// Function to get POS transactions  
export async function getLSRetailDocuments(storeNo: string): Promise<LSRetailResponse<LSRetailDocumentResponse>> {  
    return fetchLSRetailData<LSRetailDocumentResponse>('postrans', storeNo);  
}  

// Function to get POS transaction lines  
export async function getLSRetailTransactionLines(documentNo: string): Promise<LSRetailResponse<LSRetailTransactionResponse>> {  
    return fetchLSRetailData<LSRetailTransactionResponse>('postransline', documentNo);  
}  

// Helper function for error handling  
export function handleLSRetailError(error: unknown): LSRetailResponse<never> {  
    console.error('LS Retail Error:', error);  
    return {  
        success: false,  
        message: error instanceof Error ? error.message : 'An unknown error occurred'  
    };  
}