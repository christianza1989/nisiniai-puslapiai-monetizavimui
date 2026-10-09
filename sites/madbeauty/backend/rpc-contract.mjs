export const publicRpcMethods=new Set(['catalog','profile','availability','option','taxonomy','search','searchResults','visitAvailability','erasureStatus']);
export const rpcMethods=new Set([...publicRpcMethods,'saveGallery','reviewReport','organizationReport','saveBookingRules','erasureCase','erasurePreview','reviewErasure','rebooking','saveClientCard','exportCustomer','requestErasure','withdrawErasure','createWaitlist','acceptWaitlist','closeWaitlist','holdVisit','confirmVisit','changeVisit','saveLocation','submitLocation','moderateLocation','setLocationActive','assignStaffLocations','grantMembership','revokeMembership','bulkOfferPrices','saveMenuGroup','selectProcedures','saveOffer','submitOffer','moderateOffer','archiveOffer','requestProcedure','moderateProcedure','changeTaxonomy','assessQualification','migrateCatalogue','workspace','createOrganization','createService','createStaff','createResource','createClient','createBusyBlock','releaseBusyBlock','hold','releaseHold','confirm','cancelBooking','changeBooking','manualVisit','edit','submitRevision','moderate','moderateReview','createInquiry','message','review','report','preferences','metrics','favorite','retryOutbox','completeBooking']);

// One calling convention for Node HTTP, the directory and private organization RPC.
export function invokePlatform(platform,method,user,input={}){
 if(method==='visitAvailability'||method==='availability')return platform[method](input,user);
 if(['searchResults','search','catalog'].includes(method))return platform[method](input);
 if(method==='taxonomy')return platform.taxonomy();
 if(method==='profile')return platform.profile(input.id);
 if(method==='option')return platform.option(input.id,input.addons,input.practitionerId);
 if(method==='releaseHold')return platform.releaseHold(user,input.id);
 if(method==='metrics')return platform.metrics(user);
 if(method==='session')return platform.session(user);
 return platform[method](user,input);
}
