// Hosted persistence is an adapter. These rules reuse the local Studio kernel.
import { revisionHash, revisionPayload, normalizeBlocks, approveDraftSnapshot } from './authoring-core.mjs';
import { editorialReview, pageReadiness } from './content-workflow.mjs';
import { localPublishAt } from './content-schedule.mjs';
export { revisionHash, revisionPayload, localPublishAt };
const error = message => Object.assign(new Error(message), { status: 400 });
function text(value, limit, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw error(`${label}: reikia1–${limit} simbolių.`);
  return value.trim();
}
export function editHostedDraft(base, input, timezone = 'Europe/Vilnius') {
  const allowed = new Set(['title','description','body','localDate','localTime']);
  if (!input || typeof input !== 'object' || Object.keys(input).some(k => !allowed.has(k))) throw error('Neleidžiami redagavimo laukai.');
  const draft = structuredClone(base);
  if ('title' in input) draft.title = text(input.title,300,'Antraštė');
  if ('description' in input) draft.description = text(input.description,300,'Aprašymas');
  if ('body' in input) {
    if (!Array.isArray(input.body) || !input.body.length || input.body.length > 100) throw error('Reikia1–100 turinio blokų.');
    for (const b of input.body) {
      if (!b || typeof b !== 'object') throw error('Netinkamas turinio blokas.');
      if (b.type === 'paragraph') text(b.text,3000,'Pastraipa');
      else if (b.type === 'heading') { text(b.text,500,'Skyriaus antraštė'); if (![2,3].includes(b.level)) throw error('Antraštės lygis turi būti2 arba3.'); }
      else if (b.type === 'list') { if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) throw error('Sąraše turi būti1–30 punktų.');for (const item of b.items) text(item,700,'Sąrašo punktas'); }
      else if (b.type === 'image') { if (!base.media.some(a => a.id === b.assetId)) throw error('Nežinomas turinio vaizdas.'); }
      else throw error('Nežinomas turinio bloko tipas.');
    }
    draft.body = normalizeBlocks(input.body);
  }
  if ('localDate' in input || 'localTime' in input) { try { draft.publishAt = localPublishAt(input.localDate,input.localTime,timezone); } catch(e) { e.status=400;throw e; } }
  delete draft.approval;delete draft.revisionHash;
  draft.revisionHash = revisionHash(draft);
  return draft;
}
export async function approveHostedDraft(context, draft, actorId, evidence, verifyMedia, at = Date.now()) {
  if (!actorId || !context || context.id !== draft.siteId) throw error('Nėra redaktoriaus arba svetainės konteksto.');
  const page = structuredClone(draft);
  const hash = revisionHash(page);
  page.editorialReview = editorialReview(context,page,hash,{revisionHash:hash,reviewer:actorId,evidence},at);
  const ready = pageReadiness(context,page,hash);
  if (ready.blockers.length) throw error(ready.blockers.join(' '));
  if (typeof verifyMedia !== 'function') throw error('Nėra medijos saugyklos patikros.');
  for (const asset of page.media) await verifyMedia(asset);
  approveDraftSnapshot(context,page,actorId,{networkIndex:context.networkIndex || [],networkDomains:new Set(context.networkDomains || []),now:at});
  return { page:page.publishedRevision, review:page.editorialReview };
}
