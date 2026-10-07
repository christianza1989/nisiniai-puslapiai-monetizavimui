import {getSite,editPage,revisionHash,recordEditorialReview,approveReviewedBatch,releaseContent} from '../src/model.mjs';
import {writeFile} from 'node:fs/promises';
const s=await getSite('roletaiklaipedoje'),old=s.pages.find(p=>p.slug==='apie-projekta');
const body=old.body.map(b=>b.text?{...b,text:b.text.replace('[kontaktų puslapį]','kontaktų puslapį')}:b);
await editPage(s.id,old.id,{body});const p=(await getSite(s.id)).pages.find(p=>p.id===old.id);
await recordEditorialReview(s.id,p.id,{revisionHash:revisionHash(p),reviewer:'Codex /root — visible inline-link correction',evidence:{...old.editorialReview.evidence,presentation:'Read actual desktop/mobile About page; literal square brackets around a contextual link were visible. Removed this single formatting artifact via model API, retaining the same target ID and useful label. Final HTTP/browser body must be rechecked; previous review limitations remain historical.'}});
await approveReviewedBatch(s.id,[p.id],'Codex /root — inline correction, no deployment');
const release=await releaseContent(s.id);await writeFile(new URL('../../sites/roletaiklaipedoje/LOCAL_RELEASE.json',import.meta.url),JSON.stringify(release,null,2));console.log(JSON.stringify(release));
