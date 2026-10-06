// Domain admission after the common immutable package validator. No shared-core mutation.
export function admitMadbeautyPackage(pkg,contact){
 if(pkg.siteId!=='madbeauty'||pkg.canonicalHost!=='madbeauty.lt'||pkg.locale!=='lt-LT')throw Error('Wrong Madbeauty tenant/host/locale');
 if(pkg.site.contact.email!==contact.email||pkg.schemaVersion===2&&pkg.site.operatorName!==contact.operatorName)throw Error('Madbeauty approved contact/operator mismatch');
 for(const p of pkg.pages){
  if(/^(api|meistrui|paskyra|operatorius|registracija|runtime|content-assets)(\/|$)/.test(p.slug))throw Error('Private platform path cannot be editorial content');
  if(pkg.schemaVersion===2){
   if(p.slug==='paslaugos'||p.slug.startsWith('paslaugos/'))throw Error('Catalogue route is a platform module, not an editorial publication');
   if(['article','guide'].includes(p.type)&&!/^gidai\/[a-z0-9-]+$/.test(p.slug))throw Error('Madbeauty articles must use gidai/{slug}');
   if(p.type==='author'&&!/^autoriai\/[a-z0-9-]+$/.test(p.slug))throw Error('Madbeauty author path mismatch');
  }
 }
 return pkg;
}
