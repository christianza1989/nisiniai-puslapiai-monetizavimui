import type { NextConfig } from 'next';
const config: NextConfig = {
  trailingSlash: true,
  devIndicators: false,
  poweredByHeader: false,
  output: process.env.CLOUDFLARE_BUILD==='true'?undefined:'standalone',
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next'),
  serverExternalPackages: ['nodemailer','pdfkit'],
  webpack(config,{dev,webpack}){
    if(dev&&process.env.ERGONOMIC_LOCAL_ASSET_ORIGIN){
      config.cache=false;
      // Next's Windows entry calculation prefixes a cross-drive dependency
      // path with './'. Qualified D: packages can be reused by an E: source.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^\.\/[A-Za-z]:[\\/]/,(request:{request:string})=>{request.request=request.request.slice(2);}));
    }
    return config;
  },
  outputFileTracingIncludes: {'/*':['./content/**/*.json','./public/fonts/manrope.ttf','./public/media/configurator/*.jpg']},
  outputFileTracingExcludes: {'/*':['./.env*','./.local-admin.txt','./.runtime/**','./backups/**','./tests/**','./.impeccable/**']},
  images: { remotePatterns: [
    { protocol: 'https', hostname: 'www.nowystyl.com', pathname: '/getmedia/**' },
    { protocol: 'https', hostname: 'dam.nowystyl.com', pathname: '/**' }
  ] },
  // Optional loopback-only asset reuse for isolated metadata/source previews.
  // No model baseline is copied and no deployed origin is changed.
  async rewrites(){
    const origin=process.env.ERGONOMIC_LOCAL_ASSET_ORIGIN;
    if(!origin)return [];
    if(!/^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(origin))throw Error('Local asset origin must be loopback');
    return {afterFiles:['/models/:path*','/media/:path*','/fonts/:path*','/branding/:path*','/icon.svg'].map(source=>({source,destination:origin+source}))};
  },
  async headers() { return [{source:'/:path*',headers:[
    {key:'X-Content-Type-Options',value:'nosniff'},
    {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
    {key:'X-Frame-Options',value:'DENY'},
    {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'}
  ]},{source:'/valdymas/:path*',headers:[{key:'Cache-Control',value:'private, no-store'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]},{source:'/valdymas/perziura/',headers:[{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"frame-ancestors 'self'"}]}]; }
};
export default config;
