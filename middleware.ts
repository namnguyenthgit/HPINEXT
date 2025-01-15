// middleware.ts  
import { NextResponse } from 'next/server'  
import type { NextRequest } from 'next/server'  
import { RateLimiter } from './lib/rate-limit';
import { getLoggedInUser, getUserRole } from './lib/actions/user.actions';

//ratelimit
const limiter = new RateLimiter(); // 60 requests per minute 

// Static paths that don't need authentication checks  
const staticPaths = [  
  '_next/static',  
  '_next/image',  
  'favicon.ico',  
  'public',  
  'assets',  
  '.png',  
  '.jpg',  
  '.jpeg',  
  '.gif',  
  '.svg',  
  '.ico'  
]; 

// Add paths that don't require authentication  
export const publicPaths = [  
  '/sign-in',
  '/sign-up',  
  //'/',  
  '/api',
  '/icons'  
] as const;

// Add admin paths that should be accessible  
const adminPaths = [  
  '/(admin)',  
  '/(admin)/backup',  
  '/(admin)/restore',  
  // Add other admin routes as needed  
] as const;

const authPaths = [
  '/payment-transfer',
  '/transaction-history',
] as const;

// Add type safety to path checks  
function isPathMatch(pathname: string, paths: readonly string[]): boolean {  
  return paths.some(path => path === pathname || pathname.startsWith(path));  
}

function getRateLimitHeaders(limit: number, remaining: number, reset: number) {  
  return {  
    'Retry-After': `${Math.ceil((reset - Date.now()) / 1000)}`,  
    'X-RateLimit-Limit': `${limit}`,  
    'X-RateLimit-Remaining': `${remaining}`,  
    'X-RateLimit-Reset': `${Math.ceil(reset / 1000)}`  
  };  
}  

function getRateLimitResponse(limit: number, remaining: number, reset: number) {  
  return new NextResponse('Too Many Requests', {  
    status: 429,  
    headers: getRateLimitHeaders(limit, remaining, reset)  
  });  
}

function addRateLimitHeaders(response: NextResponse, limit: number, remaining: number, reset: number) {  
  const headers = getRateLimitHeaders(limit, remaining, reset);  
  Object.entries(headers).forEach(([key, value]) => {  
    response.headers.set(key, value);  
  });  
  return response;  
}  

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // First check if it's a static path - return early  
  const isStaticPath = isPathMatch(pathname,staticPaths);
  if (isStaticPath) {  
    return NextResponse.next();  
  }
  
  const forwardedFor = request.headers.get('x-forwarded-for');  
  const ip = forwardedFor?.split(',')[0] ??   
             request.headers.get('x-real-ip') ??   
             'unknown';  

  const isPublicPath = isPathMatch(pathname,publicPaths);
  // For public paths, only apply basic rate limiting  
  if (isPublicPath) {  
    const { limited, remaining, reset, limit } = limiter.check({  
      ip,  
      path: pathname  
    });  

    if (limited) {  
      return getRateLimitResponse(limit, remaining, reset);  
    }  

    return addRateLimitHeaders(NextResponse.next(), limit, remaining, reset);  
  }

  const loggedIn = await getLoggedInUser();
  // Verify session for protected paths  
  if (!loggedIn) {  
    const response = NextResponse.redirect(new URL('/sign-in', request.url));  
    response.cookies.delete('hpinext-session');  
    return response;  
  }
  // Apply rate limiting with user context
  const userId = loggedIn.$id;
  const { limited, remaining, reset, limit } = limiter.check({  
    ip,  
    userId,  
    path: pathname  
  });  

  if (limited) {  
    return getRateLimitResponse(limit, remaining, reset);  
  }

  // Handle admin and auth paths
  const isAdminPath = isPathMatch(pathname,adminPaths);
  const isAuthPath = isPathMatch(pathname,authPaths);
  const userRole = await getUserRole();
  if (isAdminPath|| isAuthPath) {  
    if (isAdminPath && (userRole !== 'admin')) {  
      return NextResponse.redirect(new URL('/', request.url));  
    }  
  }  

  const response = NextResponse.next();  
  return addRateLimitHeaders(response, limit, remaining, reset);  

} 

// Update the matcher to include (admin) routes  
export const config = {  
  matcher: [  
    // Match all paths except static files  
    '/((?!_next/static|_next/image|favicon.ico|public|assets|.png|.jpg|.jpeg|.gif|.svg|.ico).*)',  
    // Explicitly match admin routes  
    '/(admin)/:path*'  
  ], 
}