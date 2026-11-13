import {z} from 'zod';

const hash=z.string().regex(/^[a-f0-9]{64}$/);
const id=z.string().regex(/^[A-Za-z0-9_-]{1,120}$/);
const index=z.number().int().min(0).max(1000);
const route={versionId:id,constructionId:id,finishId:id,packageSha:hash};
const qualified=z.object({
 witness:id,kind:z.enum(['single','groups']),branch:id.optional(),single:id.optional(),
 groups:z.record(id,id).refine(groups=>Object.keys(groups).length<=24)
});
export const pc2SelectionSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('desk'),code:z.string().regex(/^K[A-Z0-9]{2,30}$/),packageSha:hash,stateId:hash}),
 z.object({kind:z.literal('chair'),code:z.string().regex(/^K[A-Z0-9]{2,30}$/),...route,
  visual:z.object({visualId:id,mappingId:id}).optional(),
  context:index,variants:z.array(index).max(36),functionalIndex:index,observed:z.string().min(1).max(220),
  qualified:qualified.optional(),
  pending:z.object({...route,witness:id,single:id}).optional()
 })
]);
export type Pc2Selection=z.infer<typeof pc2SelectionSchema>;
export type Pc2ChairSelection=Extract<Pc2Selection,{kind:'chair'}>;
export type Pc2ChairRoute=Pick<Pc2ChairSelection,'kind'|'code'|'versionId'|'constructionId'|'finishId'|'packageSha'|'visual'>;
export type Pc2PendingFinish=NonNullable<Pc2ChairSelection['pending']>;
export function pc2QuoteEnabled(){
 return process.env.LAUNCH_SITE!=='true'&&process.env.ERGONOMIC_PC2_CHAIR_REVIEW==='true';
}
