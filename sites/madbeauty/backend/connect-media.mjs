// One-time source migration for media fields; kept as a reproducible scoped edit.
import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('./platform.mjs',import.meta.url);let s=await readFile(file,'utf8');
s=s.replace("avatarImageId:o.avatarImageId||null};};","avatarImageId:o.avatarImageId||null,media:(d.media||[]).filter(a=>a.id===o.avatarImageId).map(mediaPublic)};};");
s=s.replace("return {...publicOrg(o),location:","return {...publicOrg(o),media:(d.media||[]).filter(a=>o.gallery.includes(a.id)||o.avatarImageId===a.id).map(mediaPublic),location:");
s=s.replace("approved:false,profileState:'draft',gallery:[],avatarImageId:null","approved:false,profileState:'draft',gallery:[],draftGallery:[],draftAvatarImageId:null,avatarImageId:null");
s=s.replace("state:'pending',createdAt:clock().now};d.revisions.push(revision)","state:'pending',gallery:[...(o.draftGallery||o.gallery)],avatarImageId:o.draftAvatarImageId||o.avatarImageId,createdAt:clock().now};d.revisions.push(revision)");
s=s.replace("o.name=r.name;o.bio=r.bio;o.approved=true;","o.name=r.name;o.bio=r.bio;if(r.gallery)o.gallery=r.gallery;if(r.avatarImageId)o.avatarImageId=r.avatarImageId;o.approved=true;");
s=s.replace("    createService(user,input){","    attachMedia(user,input){return mutate(d=>{ownOrg(d,user,input.organizationId);const o=find(d,'organizations',input.organizationId);if(d.media.filter(a=>a.organizationId===o.id).length>=24)reject('LIMIT','Profilio vaizdų limitas pasiektas.');d.media.push(copy(input));if(input.usage==='portrait')o.draftAvatarImageId=input.id;else o.draftGallery=[...(o.draftGallery||o.gallery),input.id];return mediaPublic(input);});},\n    createService(user,input){");
await writeFile(file,s);
