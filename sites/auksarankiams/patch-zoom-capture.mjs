import{readFile,writeFile}from'node:fs/promises';const u=new URL('./zoom-verify.mjs',import.meta.url);let s=await readFile(u,'utf8');const pairs=[
["await settings.screenshot({path:path.join(dir,'chrome-zoom-200.png')});","await capture(settings,'chrome-zoom-200.png',false);"],
["await p.screenshot({path:path.join(dir,(slug||'home')+'-zoom200.png'),fullPage:true});","await capture(p,(slug||'home')+'-zoom200.png');"],
["await p.screenshot({path:path.join(dir,'sources-footer-zoom200.png')});","await capture(p,'sources-footer-zoom200.png');"],
["await p.screenshot({path:path.join(dir,'form-empty-zoom200.png')});","await capture(p,'form-empty-zoom200.png');"],
["await p.reload();const final=await metrics();","await p.goto('http://127.0.0.1:8890/');await p.evaluate(()=>document.fonts.ready);const final=await metrics();"],
["await settings.screenshot({path:path.join(dir,'chrome-zoom-restored100.png')});","await capture(settings,'chrome-zoom-restored100.png',false);"],
["mechanism:'Actual Chrome", "capture:'Chrome CDP Page.captureScreenshot with DIP layoutViewport/contentSize clipping; Playwright CSS clipping at native page zoom was corrected, no page/CSS scaling applied',mechanism:'Actual Chrome"]];for(const[a,b]of pairs){if(!s.includes(a))throw Error(a);s=s.replace(a,b);}await writeFile(u,s);
