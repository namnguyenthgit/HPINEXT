// middleware.ts  
import { NextResponse } from 'next/server'  
import type { NextRequest } from 'next/server'  
import { RateLimiter } from './lib/rate-limit';  
import { getUserRole, parseSessionToken } from './lib/actions/user.actions';
import { appConfig } from './lib/appconfig';

const limiter = new RateLimiter();
const COOKIE_NAME = appConfig.cookie_name;

// Add blocked paths that should return 404  
const blockedPaths = [  
  '/add-banks',  
  '/marketprice',  
  '/add-bank'  
] as const;  

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
] as const;  

// Add paths that don't require authentication  
export const publicPaths = [  
  '/sign-in',  
  '/sign-up',  
  '/api',  
  '/icons'  
] as const;  

// Add admin paths that should be accessible  
const adminPaths = [  
  '/(admin)',  
  '/(admin)/backup',  
  '/(admin)/restore',  
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

  // Check blocked paths first - return 404  
  if (isPathMatch(pathname, blockedPaths)) {  
    return NextResponse.rewrite(new URL('/404', request.url));  
  }

  // Check static paths first  
  if (isPathMatch(pathname, staticPaths)) {  
    return NextResponse.next();  
  }  

  // Get IP address  
  const forwardedFor = request.headers.get('x-forwarded-for');  
  const ip = forwardedFor?.split(',')[0] ??  
             request.headers.get('x-real-ip') ??  
             'unknown';  
  const userAgent = request.headers.get('user-agent') ?? 'unknown';

  let userId: string | undefined;
  const sessionCookie  = request.cookies.get(COOKIE_NAME)?.value;  
  if (sessionCookie) {  
    const sessionInfo = await parseSessionToken(sessionCookie);  
    if (sessionInfo) {  
      userId = sessionInfo.userId;  
    }  
  }

  try {
    const { limited, remaining, reset, limit } = await limiter.check({  
      ip,  
      userAgent,  
      userId,  
      path: pathname  
    });

    
    if (limited) {  
      return getRateLimitResponse(limit, remaining, reset);  
    }

    // Check if it's a public path  
    // For public paths, just apply rate limiting  
    if (isPathMatch(pathname, publicPaths)) {  
      return addRateLimitHeaders(NextResponse.next(), limit, remaining, reset);  
    }

    // For protected paths, verify session  
    if (!userId) {  
      return NextResponse.redirect(new URL('/sign-in', request.url));  
    }   

    // Check admin and auth paths  
    const isAdminPath = isPathMatch(pathname, adminPaths);  
    const isAuthPath = isPathMatch(pathname, authPaths);  

    if (isAdminPath || isAuthPath) {  
      const userRole = await getUserRole();  
      
      if (isAdminPath && userRole !== 'admin') {  
        return NextResponse.redirect(new URL('/', request.url));  
      }  
    }  

    // All checks passed, proceed with the request  
    const response = NextResponse.next();  
    return addRateLimitHeaders(response, limit, remaining, reset);  

  } catch (error) {  
    console.error('Middleware error:', error);  
    
    // On error, redirect to sign-in and clear session  
    const response = NextResponse.redirect(new URL('/sign-in', request.url));  
    response.cookies.delete(COOKIE_NAME);  
    return response;  
  }  
}  

export const config = {  
  matcher: [  
    // Match all paths except static files  
    '/((?!_next/static|_next/image|favicon.ico|public|assets|.png|.jpg|.jpeg|.gif|.svg|.ico).*)',  
    // Explicitly match admin routes  
    '/(admin)/:path*',
    // Explicitly match blocked paths  
    '/add-banks',  
    '/marketprice',  
    '/add-bank'
  ],  
}