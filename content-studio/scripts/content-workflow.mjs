import { readFile } from 'node:fs/promises';
import { getContentWorkflow, editSite, finalizeInternalLinks, recordEditorialReview, recordEditorialReviewBatch, approveReviewedBatch, releaseContent } from '../src/model.mjs';
const [command, siteId, file, pageId] = process.argv.slice(2);
try {
  if (!siteId) throw new Error('Naudojimas: node content-studio/scripts/content-workflow.mjs <status|policy|finalize|review|review-batch|approve|release> <siteId> [JSON-failas] [pageId].');
  const input = file ? JSON.parse(await readFile(file, 'utf8')) : null;
  const result = command === 'status' ? await getContentWorkflow(siteId)
    : command === 'policy' ? (await editSite(siteId, { contentPolicy: input })).contentPolicy
    : command === 'finalize' ? await finalizeInternalLinks(siteId, input.pageIds)
    : command === 'review' ? await recordEditorialReview(siteId, pageId, input)
    : command === 'review-batch' ? await recordEditorialReviewBatch(siteId, input.reviews)
    : command === 'approve' ? await approveReviewedBatch(siteId, input.pageIds, input.actorId)
    : command === 'release' ? await releaseContent(siteId)
    : (() => { throw new Error('Nežinoma workflow komanda.'); })();
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
} catch (error) { process.stderr.write(String(error.message || error) + '\n'); process.exitCode = 1; }
