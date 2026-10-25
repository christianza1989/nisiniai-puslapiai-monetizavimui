import {instagramResponse,syncInstagram} from './instagram.mjs';
export default {
  async fetch(request,env) { return instagramResponse(request,env); },
  async scheduled(_controller,env,ctx) { ctx.waitUntil(syncInstagram(env).then(result => console.log(JSON.stringify({event:'instagram_refresh',...result})))); }
};
