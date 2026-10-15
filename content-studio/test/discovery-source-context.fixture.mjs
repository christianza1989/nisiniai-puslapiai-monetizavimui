import {createHash,randomUUID} from 'node:crypto';
import {stableV2} from '../src/content-package-v2.mjs';
export const sourceDigest=v=>createHash('sha256').update(stableV2(v)).digest('hex');
export function sourceFixture(creationId=randomUUID(),text='Gamintojas teigia: ąžuolas 🧖') {
  const value={version:'discovery-source-context.v1',creationId,discoveryId:randomUUID(),reportId:randomUUID(),reportRevision:1,
    reportSha256:'a'.repeat(64),planSha256:'b'.repeat(64),discoveryJobId:randomUUID(),sourceRevision:'c'.repeat(40),
    capturedSourcesSha256:'d'.repeat(64),sources:[{url:'https://example.org/factory',status:'observed',title:'Gamintojo teiginys',
      observedAt:'2026-10-15T00:00:00+00:00',httpStatus:200,responseBytes:40000,bodySha256:'e'.repeat(64),
      textSha256:createHash('sha256').update(text).digest('hex'),text,textChars:[...text].length,textMayBeClipped:[...text].length===9000}],
    coverage:{readerReportedComplete:true,capturedCount:1,includedCount:1,omittedCount:0,remainingUrlCount:0,
      capturedClippedCount:[...text].length===9000?1:0,includedClippedCount:[...text].length===9000?1:0},
    claimStatus:'external_source_claims',independentVerification:'UNVERIFIED',excerptLimitChars:9000};
  return {...value,contextSha256:sourceDigest(value)};
}
