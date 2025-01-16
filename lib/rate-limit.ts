// lib/rate-limit.ts  
import { kv } from '@vercel/kv';  
import { UAParser } from 'ua-parser-js';  

interface RateLimitInfo {  
  count: number;  
  firstAttempt: number;  
}  

type RateLimitKey = {  
  ip: string;  
  userAgent: string;  
  userId?: string;  
  path: string;  
}  

export class RateLimiter {  
  private readonly limits = {  
    auth: {  
      authenticated: { requests: 50, windowMs: 60000 },  
      anonymous: { requests: 15, windowMs: 60000 }  
    },  
    api: {  
      authenticated: { requests: 100, windowMs: 60000 },  
      anonymous: { requests: 50, windowMs: 60000 }  
    },  
    default: {  
      authenticated: { requests: 200, windowMs: 60000 },  
      anonymous: { requests: 50, windowMs: 60000 }  
    }  
  };  

  private getDeviceFingerprint(userAgent: string): string {  
    const parser = new UAParser(userAgent);  
    const result = parser.getResult();  
    
    // Combine relevant device information  
    const parts = [  
      result.browser.name,  
      result.browser.version,  
      result.os.name,  
      result.os.version,  
      result.device.vendor,  
      result.device.model,  
      result.device.type  
    ].filter(Boolean);  

    return parts.join('|');  
  }  

  private getKey(info: RateLimitKey): string {  
    const parts = ['ratelimit'];  
    
    if (info.userId) {  
      // For authenticated users: combine userId and IP  
      parts.push(`user:${info.userId}`);  
      parts.push(`ip:${info.ip}`);  
    } else {  
      // For anonymous users: combine IP and device fingerprint  
      parts.push(`ip:${info.ip}`);  
      parts.push(`device:${this.getDeviceFingerprint(info.userAgent)}`);  
    }  
    
    parts.push(`path:${info.path}`);  
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

  async check(info: RateLimitKey): Promise<{  
    limited: boolean;  
    remaining: number;  
    reset: number;  
    limit: number;  
  }> {  
    const key = this.getKey(info);  
    const now = Date.now();  
    const isAuthenticated = Boolean(info.userId);  
    const limits = this.getLimits(info.path, isAuthenticated);  

    try {  
      const currentInfo = await kv.get<RateLimitInfo>(key);  

      if (!currentInfo) {  
        const newInfo: RateLimitInfo = { count: 1, firstAttempt: now };  
        await kv.set(key, newInfo, { px: limits.windowMs });  

        return {  
          limited: false,  
          remaining: limits.requests - 1,  
          reset: now + limits.windowMs,  
          limit: limits.requests  
        };  
      }  

      if (now - currentInfo.firstAttempt > limits.windowMs) {  
        const newInfo: RateLimitInfo = { count: 1, firstAttempt: now };  
        await kv.set(key, newInfo, { px: limits.windowMs });  

        return {  
          limited: false,  
          remaining: limits.requests - 1,  
          reset: now + limits.windowMs,  
          limit: limits.requests  
        };  
      }  

      const updatedInfo: RateLimitInfo = {  
        count: currentInfo.count + 1,  
        firstAttempt: currentInfo.firstAttempt  
      };  

      const remainingMs = currentInfo.firstAttempt + limits.windowMs - now;  
      await kv.set(key, updatedInfo, { px: remainingMs });  

      const remaining = Math.max(0, limits.requests - updatedInfo.count);  
      const reset = currentInfo.firstAttempt + limits.windowMs;  

      return {  
        limited: updatedInfo.count > limits.requests,  
        remaining,  
        reset,  
        limit: limits.requests  
      };  
    } catch (error) {  
      console.error('Rate limit check failed:', error);  
      return {  
        limited: false,  
        remaining: limits.requests,  
        reset: now + limits.windowMs,  
        limit: limits.requests  
      };  
    }  
  }  
}