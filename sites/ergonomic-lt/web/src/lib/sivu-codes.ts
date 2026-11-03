import type {Configuration} from './types';

// Verified against the three sample IDs and their individual Configure links:
// https://www.nowystyl.com/en/sivu/armchairs-leg-rests/
const samples:Record<string,[string,string,string]>={
 '30156244':['3','MU','MU52'],
 '30156245':['4','FOCUS','FC60509'],
 '30156246':['4','MLF','MLF32'],
};
export function recoverSivuConfiguration(productId:string,c:Configuration):Configuration{
 if(productId!=='product_sivu-armchairs-leg-rests_17b08ecb'||c.code)return c;
 const sample=samples[c.id];if(!sample)return c;
 const [price,group,color]=sample,code='KSIV001002';
 const supplierOptions=['CPRICEGROUP='+price,'CUPHGROUP='+group,'CUPHBACKRESTCOLOR='+color,'CUPHSEATCOLOR='+color].map(v=>code+'_FINISHES.'+v);
 return {...c,code,supplierOptions,configurator:'https://configurator.kusch.com/#ban='+code+'&sid=SIV&ovc='+encodeURIComponent(supplierOptions.join(';'))+'&lang=en'};
}
