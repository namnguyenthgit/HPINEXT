// lib/rate-limit.ts  
interface RateLimitInfo {  
  count: number;  
  firstAttempt: number;  
}  

type RateLimitKey = {  
  ip: string;  
  sessionId?: string;  
  userId?: string;  
  path: string;  
}  

export class RateLimiter {  
  private cache = new Map<string, RateLimitInfo>();  
  
  // Different limits for different types of requests  
  private readonly limits = {  
    auth: { // Login/Register endpoints  
      authenticated: { requests: 50, windowMs: 60000 }, // 50 requests/minute for logged in users  
      anonymous: { requests: 15, windowMs: 60000 }  // 15 requests/minute for anonymous  
    },  
    api: { // API endpoints  
      authenticated: { requests: 100, windowMs: 60000 }, // 100 requests/minute for logged in  
      anonymous: { requests: 50, windowMs: 60000 } // 50 requests/minute for anonymous  
    },  
    default: {  
      authenticated: { requests: 200, windowMs: 60000 }, // 200 requests/minute for logged in  
      anonymous: { requests: 50, windowMs: 60000 } // 50 requests/minute for anonymous  
    }  
  };  

  constructor() {  
    // Clean up old entries every minute  
    setInterval(() => this.cleanup(), 60000);  
  }  

  private getKey(info: RateLimitKey): string {  
    const parts = [info.ip];  
    
    if (info.sessionId) parts.push(info.sessionId);  
    if (info.userId) parts.push(info.userId);  
    parts.push(info.path);  
    
    return parts.join(':');  
  }  

  private getLimits(path: string, isAuthenticated: boolean) {  
    if (path.startsWith('/api')) {  
      return this.limits.api[isAuthenticated ? 'authenticated' : 'anonymous'];  
    }  
    if (path.startsWith('/sign-in') || path.startsWith('/sign-up')) {  
      return this.limits.auth[isAuthenticated ? 'authenticated' : 'anonymous'];  
    }  
    return this.limits.default[isAuthenticated ? 'authenticated' : 'anonymous'];  
  }  

  check(info: RateLimitKey): {   
    limited: boolean;   
    remaining: number;   
    reset: number;  
    limit: number;  
  } {  
    const key = this.getKey(info);  
    const now = Date.now();  
    const isAuthenticated = Boolean(info.userId);  
    const limits = this.getLimits(info.path, isAuthenticated);  
    
    const currentInfo = this.cache.get(key);  

    if (!currentInfo) {  
      this.cache.set(key, { count: 1, firstAttempt: now });  
      return {  
        limited: false,  
        remaining: limits.requests - 1,  
        reset: now + limits.windowMs,  
        limit: limits.requests  
      };  
    }  

    // Reset if time window has passed  
    if (now - currentInfo.firstAttempt > limits.windowMs) {  
      this.cache.set(key, { count: 1, firstAttempt: now });  
      return {  
        limited: false,  
        remaining: limits.requests - 1,  
        reset: now + limits.windowMs,  
        limit: limits.requests  
      };  
    }  

    // Increment counter  
    currentInfo.count += 1;  
    this.cache.set(key, currentInfo);  

    const remaining = Math.max(0, limits.requests - currentInfo.count);  
    const reset = currentInfo.firstAttempt + limits.windowMs;  

    return {  
      limited: currentInfo.count > limits.requests,  
      remaining,  
      reset,  
      limit: limits.requests  
    };  
  }  

  private cleanup() {  
    const now = Date.now();  
    for (const [key, info] of this.cache.entries()) {  
      if (now - info.firstAttempt > 60000) { // Clean entries older than 1 minute  
        this.cache.delete(key);  
      }  
    }  
  }  
}