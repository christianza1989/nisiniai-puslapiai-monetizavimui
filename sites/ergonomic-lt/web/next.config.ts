import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  devIndicators: false,
  poweredByHeader: false,
  output: process.env.CLOUDFLARE_BUILD==='true'?undefined:'standalone',
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  serverExternalPackages: ['nodemailer','pdfkit'],
  outputFileTracingIncludes: {'/*':['./content/**/*.json','./public/fonts/manrope.ttf','./public/media/configurator/*.jpg']},
  outputFileTracingExcludes: {'/*':['./.env*','./.local-admin.txt','./.runtime/**','./backups/**','./tests/**','./.impeccable/**']},
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'www.nowystyl.com', pathname: '/getmedia/**' },
    { protocol: 'https', hostname: 'dam.nowystyl.com', pathname: '/**' }
  ] },
  async headers() { return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]},{source:'/valdymas/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source:'/valdymas/perziura/',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"frame-ancestors 'self'"}]}]; }
};
export default config;
