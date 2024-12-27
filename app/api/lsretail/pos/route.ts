import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Type definition for POST request body
interface RequestBody {
    name?: string;
    value?: number;
}

// GET handler
export async function GET(request: NextRequest) {
    try {
        return NextResponse.json({
            message: 'helloworld',
            method: 'GET'
        }, { status: 200 })
    } catch (error) {
        return NextResponse.json({
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}

// POST handler
export async function POST(request: NextRequest) {
    try {
        // Parse the JSON body
        const body: RequestBody = await request.json()
        
        return NextResponse.json({
            message: 'Data received successfully',
            receivedData: body,
            method: 'POST'
        }, { status: 200 })
        
    } catch (error) {
        return NextResponse.json({
            error: 'Invalid request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 })
    }
}