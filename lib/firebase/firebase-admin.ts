import * as firebaseadmin from 'firebase-admin';

export function initFirebaseAdmin() {
    if (!firebaseadmin.apps.length) {
        firebaseadmin.initializeApp({
            credential: firebaseadmin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    }

    return firebaseadmin;
}  