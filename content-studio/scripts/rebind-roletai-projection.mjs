import {getSite,editPage,revisionHash,recordEditorialReview,approveReviewedBatch,releaseContent} from '../src/model.mjs';
import {writeFile} from 'node:fs/promises';
const s=await getSite('roletaiklaipedoje'),home=s.pages.find(p=>p.type==='home'),future=s.pages.find(p=>p.slug==='gidai/pasiulymu-palyginimas');
await editPage(s.id,home.id,{bodyProjection:'canonical'});
await editPage(s.id,future.id,{publishAt:new Date(Date.now()+6*60*1000).toISOString()});
const current=await getSite(s.id);
for(const old of [home,future]){const p=current.pages.find(p=>p.id===old.id);await recordEditorialReview(s.id,p.id,{revisionHash:revisionHash(p),reviewer:'Codex /root — signed projection correction',evidence:{...old.editorialReview.evidence,presentation:old.editorialReview.evidence.presentation+' Canonical homepage full body was checked against actual UTF-8 HTTP HTML; it alone explicitly opts into whole-body LLM export. Publication wall-clock transition must be rerun for this amended package. No other body or approval date rewritten.'}});}
await approveReviewedBatch(s.id,[home.id,future.id],'Codex /root — local projection correction; no deployment');
const release=await releaseContent(s.id);await writeFile(new URL('../../sites/roletaiklaipedoje/LOCAL_RELEASE.json',import.meta.url),JSON.stringify(release,null,2));console.log(JSON.stringify(release));
