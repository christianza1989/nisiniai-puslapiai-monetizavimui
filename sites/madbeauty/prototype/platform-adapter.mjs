import {createAdapter} from './demo-adapter.mjs';
import {enrichDemo,attachPlatform} from './platform-domain.mjs';
import {extendProfileFixtures} from './profile-fixtures-v2.mjs';
export function createPlatformAdapter(options={}){
  return createAdapter({...options,extend:(base,data)=>attachPlatform(base,options.richFixtures?extendProfileFixtures(enrichDemo(data)):enrichDemo(data),{scenario:base.scenario,persistence:options.persistence})});
}
