// Compatibility API for historical offline tests; identity/MAC logic is canonical shared source.
import {canonicalNativeEmail,createRecipientCodec,ADDRESS_RULE} from './contracts/recipient-binding.mjs';
export {ADDRESS_RULE};
export const canonicalVerifiedEmail=canonicalNativeEmail;
export async function createRecipientBindingProposal(configuration){
 if(configuration.scope?.site_id!=='madbeauty')throw Error('native_site_scope_required');
 const codec=await createRecipientCodec(configuration);
 const input=value=>({invitationRef:value.invitationRef,challengeNonce:value.challengeNonce,canonicalRecipient:canonicalNativeEmail(value.verifiedEmail)});
 return Object.freeze({addressRule:ADDRESS_RULE,async sign(value){return (await codec.digest(input(value))).slice(3);},async matches(value,digest){try{return await codec.matches(input(value),digest);}catch{return false;}}});
}
