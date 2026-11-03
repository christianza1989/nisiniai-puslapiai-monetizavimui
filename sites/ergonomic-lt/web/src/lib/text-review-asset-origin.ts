/** The isolated CMS stage reads existing immutable public assets, never private APIs. */
export const TEXT_REVIEW_ASSET_ORIGIN='https://ergonomic-preview.pinet-azprekyba.workers.dev';
export function textReviewAssetRequest(request:Request){
 const source=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method)||!/^\/(?:models|media|fonts|branding)\//.test(source.pathname))throw Error('Neleistinas ištekliaus kelias.');
 const headers=new Headers();for(const key of ['Range','If-None-Match','If-Modified-Since','Accept']){const value=request.headers.get(key);if(value)headers.set(key,value);}
 return new Request(TEXT_REVIEW_ASSET_ORIGIN+source.pathname+source.search,{method:request.method,headers,redirect:'manual'});
}
