import { NextRequest, NextResponse } from 'next/server';
import { auth } from 'firebase-admin'; 
import { initFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
    try {
        // Initialize Firebase Admin if not already done  
        initFirebaseAdmin();

        const { token } = await request.json();

        // Verify the ID token  
        const decodedToken = await auth().verifyIdToken(token);
        const { uid, email, name, picture } = decodedToken;

        // Here you would typically:  
        // 1. Check if the user exists in your database  
        // 2. Create the user if they don't exist  
        // 3. Create a session or JWT for your app  

        // For this example, we'll just return the user info  
        return NextResponse.json({
            success: true,
            user: {
                id: uid,
                email,
                name,
                image: picture,
            },
        });
    } catch (error) {
        console.error('Error in Google auth API:', error);
        return NextResponse.json(
            { success: false, message: 'Authentication failed' },
            { status: 401 }
        );
    }
}  