import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';

// Optional exact release input for the existing behavioral suites. All data and
// mail remain in their isolated local Miniflare storage, never on the live host.
export async function nativeMainRuntime(fallbackScript, fallbackOrigin) {
 const artifact=process.env.MADBEAUTY_COMMUNITY_MAIN_ARTIFACT;
 if(!artifact)return {script:fallbackScript,origin:fallbackOrigin,vars:{},objects:{}};
 assert.ok(path.isAbsolute(artifact));
 const dir=path.dirname(artifact),script=await readFile(artifact,'utf8'),manifest=JSON.parse(await readFile(path.join(dir,'manifest.json'))),config=JSON.parse(await readFile(path.join(dir,'wrangler.json')));
 assert.equal(manifest.kind,'main');assert.equal(createHash('sha256').update(script).digest('hex'),manifest.artifactSha256);
 assert.equal(config.vars.APP_ORIGIN,'https://madbeauty.lt');assert.equal(config.vars.RELEASE_MODE,'production');assert.equal(config.vars.COMMUNITY_ENABLED,'true');assert.equal(config.vars.FACEBOOK_LOGIN_ENABLED,'false');
 return {script,origin:config.vars.APP_ORIGIN,vars:config.vars,objects:{ORGANIZATION_STAGING:{className:'MadbeautyOrganizationStaging',useSQLite:true}}};
}
