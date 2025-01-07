// middleware.ts  
import { NextResponse } from 'next/server'  
import type { NextRequest } from 'next/server'  

// Add paths that don't require authentication  
export const publicPaths = [  
  '/sign-in',
  '/sign-up',  
  '/forgot-password',  
  '/',  
  '/api/auth',  
  '/api/webhook',  
]  

// Add admin paths that should be accessible  
const adminPaths = [  
  '/(admin)',  
  '/(admin)/backup',  
  '/(admin)/restore',  
  // Add other admin routes as needed  
]  

export function middleware(request: NextRequest) {  
  const { pathname } = request.nextUrl  

  // Check if the path is public  
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path))  
  
  // Check if it's an admin path  
  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path))  

  // Get Appwrite session cookie  
  const appwriteSession = request.cookies.get('appwrite-session')  

  // Allow access to public paths regardless of authentication  
  if (isPublicPath) {  
    return NextResponse.next()  
  }  

  // If there's no session and trying to access protected route, redirect to login  
  if (!appwriteSession && !isPublicPath) {  
    const loginUrl = new URL('/sign-in', request.url)  
    loginUrl.searchParams.set('redirect', pathname)  
    return NextResponse.redirect(loginUrl)  
  }  

  // If it's an admin path and has valid session, allow access  
  if (isAdminPath && appwriteSession) {  
    return NextResponse.next()  
  }  

  // For all other routes with valid session  
  return NextResponse.next()  
}  

// Update the matcher to include (admin) routes  
export const config = {  
  matcher: [  
    /*  
     * Match all request paths except for the ones starting with:  
     * - _next/static (static files)  
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)  
     * - public folder  
     * Include (admin) routes  
     */  
    '/((?!_next/static|_next/image|favicon.ico|public|assets|.png|.jpg|.jpeg|.gif|.svg|.ico).*)',  
    '/(admin)/:path*'  // Add this line to explicitly match admin routes  
  ],  
}