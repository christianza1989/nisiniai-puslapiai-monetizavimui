// Read-only provider confirmation. Never write a Worker or log credentials/settings.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const h=import.meta.dirname, receipt=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const main=receipt.editions.main;
const config=await fs.readFile('C:/Users/Lenovo/AppData/Roaming/xdg.config/.wrangler/config/default.toml','utf8');
const token=config.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];assert.ok(token);
const endpoint='https://api.cloudflare.com/client/v4/accounts/d102163f74a45ab6d33bca786ce281ec/workers/scripts/madbeauty-platform-preview/deployments';
const response=await fetch(endpoint,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
assert.equal(response.status,200,'Read-only provider identity unavailable');
const dto=await response.json();assert.equal(dto.success,true);
const deployments=Array.isArray(dto.result)?dto.result:dto.result.deployments;
assert.ok(deployments?.length);const latest=deployments[0];
assert.equal(latest.versions.length,1);assert.equal(latest.versions[0].version_id,main.version);assert.equal(latest.versions[0].percentage,100);
const proof={state:'PASS_CURRENT_PROVIDER_DEPLOYMENT',checkedAt:new Date().toISOString(),worker:'madbeauty-platform-preview',version:main.version,percentage:100,deploymentId:latest.id,createdAt:latest.created_on,scope:'Independent read-only provider version/traffic confirmation; runtime/package/asset identity checked separately against compiled receipt and canonical HTTP.'};
await fs.writeFile(h+'/PROVIDER-ACCEPTANCE.json',JSON.stringify(proof,null,2)+'\n');console.log(proof);
