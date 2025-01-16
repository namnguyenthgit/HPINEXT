import type { NextConfig } from "next";  

/**  
 * @type {import('next').NextConfig}  
 */  
const nextConfig: NextConfig = {  
  // Existing configs  
  typescript: {  
    ignoreBuildErrors: true  
  },  
  eslint: {  
    ignoreDuringBuilds: true  
  },  

  // Disable powered by header  
  poweredByHeader: false,  

  // Disable server timing  
  generateEtags: false,  

  // Headers configuration  
  headers: async () => {  
    return [  
      {  
        source: '/:path*',  
        headers: [  
          {  
            // Remove x-powered-by  
            key: 'X-Powered-By',  
            value: '',  
          },  
          {  
            // Remove server  
            key: 'Server',  
            value: '',  
          },  
          {  
            // Remove all Vercel headers  
            key: 'x-vercel-protection',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-timezone',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-latitude',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-longitude',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-country-region',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-country',  
            value: '',  
          },  
          {  
            key: 'x-vercel-ip-city',  
            value: '',  
          },  
          {  
            key: 'x-vercel-cache',  
            value: '',  
          },  
          {  
            key: 'x-vercel-id',  
            value: '',  
          },  
          {  
            // Remove early hints  
            key: 'Link',  
            value: '',  
          },  
          // Security headers  
          {  
            key: 'Strict-Transport-Security',  
            value: 'max-age=31536000; includeSubDomains'  
          },  
          {  
            key: 'X-Content-Type-Options',  
            value: 'nosniff'  
          },  
          {  
            key: 'X-Frame-Options',  
            value: 'DENY'  
          },  
          {  
            key: 'X-XSS-Protection',  
            value: '1; mode=block'  
          },  
          {  
            key: 'Referrer-Policy',  
            value: 'strict-origin-when-cross-origin'  
          }  
        ],  
      },  
      // Cache static files  
      {  
        source: '/_next/static/:path*',  
        headers: [  
          {  
            key: 'Cache-Control',  
            value: 'public, max-age=31536000, immutable'  
          }  
        ]  
      }  
    ];  
  }  
};  

export default nextConfig;