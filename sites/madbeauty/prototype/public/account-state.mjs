function clearPrivateState(state,accountId){
 state.session={role:accountId?'customer':'guest',clientId:accountId,organizationId:null};
 state.booking=null;state.favorites=[];state.afterAuth=null;state.onboarding={};state.onboardingStep=0;state.calendarStaff='';state.calendarResource='';state.chatBookingId=null;state.clientFilter='';state.uploads=[];
}
export function reconcileAccountState(state,user){
 const accountId=user?.id||null,previous=Object.hasOwn(state,'realAccountId')?state.realAccountId:state.booking?.hold?.accountId??state.booking?.result?.clientId??(state.session?.role==='guest'?null:state.session?.clientId)??null;
 let changed=!!previous&&previous!==accountId;
 if(!previous&&state.booking&&(state.booking.hold||state.booking.result||state.booking.contact?.email&&state.booking.contact.email!==user?.email))changed=true;
 if(changed)clearPrivateState(state,accountId);
 else if(!previous&&accountId&&state.booking)state.booking.contact={...state.booking.contact,name:user.name||state.booking.contact?.name||'',email:user.email};
 state.realAccountId=accountId;return changed;
}
