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
  const hasSession = request.cookies.get('appwrite-session')  

  // If user is authenticated and trying to access auth pages (sign-in, sign-up)  
  if (hasSession && (pathname === '/sign-in' || pathname === '/sign-up')) {  
    return NextResponse.redirect(new URL('/', request.url))  
  }

  // Allow access to public paths regardless of authentication  
  if (isPublicPath) {  
    return NextResponse.next()  
  }  

  // For admin paths, additional checks could be added here  
  if (isAdminPath) {  
    // You could add additional admin role verification here  
    // For now, just checking for session  
    if (!hasSession) {  
      return NextResponse.redirect(new URL('/sign-in', request.url))  
    }  
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