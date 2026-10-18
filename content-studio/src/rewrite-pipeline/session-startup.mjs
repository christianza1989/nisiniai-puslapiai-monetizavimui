/** Official MCP startup only. Never launches Chrome, navigates, creates a tab,
 * sends a prompt or touches a differently named group/window. A connection's
 * temporary Welcome must not be the last target closed: adopt the retained own
 * Gemini first, then close Welcome while the Gemini target remains attached. */
export async function startGeminiSession(page, options) {
  const {ownGroupTitle,expectedGeminiUrl,expectedWindowId}=options??{};
  if(!ownGroupTitle||!/^https:\/\/gemini\.google\.com\/u\/[2-6]\/app(?:\/[^?#]+)?$/.test(expectedGeminiUrl??''))throw Error('Exact own Gemini URL/group required');
  const context=page.context();let gemini,welcomeClosed=false,adoption=null;
  if(page.url().startsWith('chrome-extension:')&&page.url().includes('/connect.html')){
    if(!Number.isInteger(expectedWindowId))throw Error('Observed dedicated window ID required');
    adoption=await page.evaluate(async({ownGroupTitle,expectedGeminiUrl,expectedWindowId})=>{
      const current=await chrome.tabs.getCurrent();
      if(current?.title!=='Welcome'||current.windowId!==expectedWindowId||current.groupId<0)throw Error('Own Welcome/window mismatch; stop');
      const currentTabs=await chrome.tabs.query({groupId:current.groupId});
      if(currentTabs.length!==1||currentTabs[0].id!==current.id)throw Error('Connection group contains another tab; stop');
      const groups=await chrome.tabGroups.query({title:ownGroupTitle});
      if(groups.length!==1||groups[0].windowId!==expectedWindowId)throw Error('Own retained group/window ambiguous; stop');
      const ownTabs=await chrome.tabs.query({groupId:groups[0].id});
      if(ownTabs.length!==1||ownTabs[0].url!==expectedGeminiUrl)throw Error('Own retained Gemini ambiguous; stop');
      const w=await chrome.windows.get(expectedWindowId,{populate:true});
      if(w.state==='minimized'||w.tabs.length!==2||w.tabs.some(t=>![current.id,ownTabs[0].id].includes(t.id)))throw Error('Dedicated window changed/minimized; stop');
      await chrome.tabs.group({groupId:current.groupId,tabIds:[ownTabs[0].id]});
      await chrome.tabGroups.update(current.groupId,{title:ownGroupTitle,color:'green'});
      await chrome.tabs.update(ownTabs[0].id,{active:true});
      return {at:new Date().toISOString(),windowId:expectedWindowId,welcomeTabId:current.id,geminiTabId:ownTabs[0].id,createdTabs:0,movedWindows:0};
    },{ownGroupTitle,expectedGeminiUrl,expectedWindowId});
    const end=Date.now()+5000;
    do{gemini=context.pages().find(p=>p!==page&&p.url()===expectedGeminiUrl);if(gemini)break;await new Promise(r=>setTimeout(r,50));}while(Date.now()<end);
    if(!gemini)throw Error('Existing Gemini did not attach; stop without creating a replacement');
    if(context.pages().length!==2)throw Error('Unexpected attached targets; stop');
    await page.close();welcomeClosed=true;
  }else{
    if(page.url()!==expectedGeminiUrl||context.pages().length!==1)throw Error('Expected sole retained Gemini; stop');
    gemini=page;
  }
  await gemini.bringToFront();
  const actual=await gemini.evaluate(()=>({at:new Date().toISOString(),url:location.href,visibilityState:document.visibilityState,hasFocus:document.hasFocus(),innerWidth,innerHeight}));
  if(actual.url!==expectedGeminiUrl||actual.visibilityState!=='visible'||context.pages().length!==1)throw Error('Sole active visible Gemini not confirmed; no pilot');
  return {welcomeClosed,adoption,actual,createdTabs:0,sendAttempts:0};
}

export function sessionStartupSource(options){return `async(page)=>{const startGeminiSession=${startGeminiSession.toString()};return startGeminiSession(page,${JSON.stringify(options)});}`;}
