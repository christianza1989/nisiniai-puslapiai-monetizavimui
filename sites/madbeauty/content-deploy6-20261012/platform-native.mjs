import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {out,repo,hash,json,save} from './common.mjs';
const artifact=path.join(out,'worker.mjs'),manifest=await json(path.join(out,'manifest.json'));assert.equal(hash(await readFile(artifact)),manifest.artifactSha256);
execFileSync(process.execPath,['--test','sites/madbeauty/cloudflare/booking-channel-runtime.test.mjs','sites/madbeauty/cloudflare/community-runtime.test.mjs','sites/madbeauty/cloudflare/community-media-runtime.test.mjs'],{cwd:repo,env:{...process.env,MADBEAUTY_BOOKING_ARTIFACT:artifact,MADBEAUTY_COMMUNITY_MAIN_ARTIFACT:artifact},stdio:'inherit'});assert.equal(hash(await readFile(artifact)),manifest.artifactSha256);await save('platform-native.json',{state:'PASS',at:new Date().toISOString(),artifactSha256:manifest.artifactSha256,exactCompiledArtifact:true,tests:4,scope:'Existing canonical booking channel and community/media behavioral suites; isolated native SQLite and mail capture only'});
