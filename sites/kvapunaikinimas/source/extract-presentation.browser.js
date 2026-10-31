async page => {
 const paths=ROUTES, out=[];
 for(const slug of paths){
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('https://kvapunaikinimas.lt/'+slug+(slug?'/':''),{waitUntil:'domcontentloaded',timeout:15000});
  await page.mouse.move(20,450);
  await page.evaluate(async()=>{for(const i of document.images){i.loading='eager';const src=i.getAttribute('nitro-lazy-src');if(src&&(i.currentSrc||i.src).startsWith('data:')){const set=i.getAttribute('nitro-lazy-srcset');if(set)i.srcset=set;i.src=src;}}for(let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}await Promise.race([Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,1200))]);await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1200))]);scrollTo(0,0);});
  out.push(await page.evaluate(slug=>{
   const norm=s=>(s||'').replace(/\s+/g,' ').trim();
   const style=e=>{const s=getComputedStyle(e);return {size:parseFloat(s.fontSize),weight:parseInt(s.fontWeight)||400,line:s.lineHeight==='normal'?'normal':parseFloat(s.lineHeight)/parseFloat(s.fontSize),align:s.textAlign,color:s.color,letter:s.letterSpacing==='normal'?0:parseFloat(s.letterSpacing),slant:s.fontStyle,marginTop:parseFloat(s.marginTop),marginBottom:parseFloat(s.marginBottom)};};
   const box=e=>{const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y+scrollY),w:Math.round(b.width),h:Math.round(b.height)};};
   const rich=e=>{
    const text=norm(e.textContent),marks=[];
    for(const c of e.querySelectorAll('strong,b,em,i,a,h1,h2,h3,h4,h5,h6')){
     const value=norm(c.textContent);if(!value)continue;
     const r=document.createRange();r.setStart(e,0);r.setEndBefore(c);
     const guess=r.toString().replace(/\s+/g,' ').replace(/^\s+/,'').length;
     const from=text.indexOf(value,Math.max(0,guess-1));if(from<0)throw Error('Unmapped inline text: '+value);
     const kind=c.tagName==='A'?'link':/^(EM|I)$/.test(c.tagName)?'em':'strong';
     if(kind==='link'&&!c.getAttribute('href'))continue;
     marks.push({kind,from,to:from+value.length,...(kind==='link'?{href:c.href}:{})});
    }
    const base=style(e),walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let cursor=0;
    while(walker.nextNode()){
     const n=walker.currentNode,value=norm(n.textContent);if(!value)continue;
     const from=text.indexOf(value,cursor);if(from<0)throw Error('Unmapped styled text: '+value);cursor=from+value.length;
     const child=style(n.parentElement),delta={};for(const key of ['size','weight','letter','color','slant'])if(child[key]!==base[key])delta[key]=child[key];
     if(Object.keys(delta).length)marks.push({kind:'style',from,to:cursor,style:delta});
    }
    return {text,marks};
   };
   const blocks=root=>{
    const selector='h1,h2,h3,h4,h5,h6,p,ul,ol';
    return [...root.querySelectorAll(selector)].filter(e=>{let p=e.parentElement;while(p&&p!==root){if(p.matches(selector))return false;p=p.parentElement;}return true;}).map(e=>{
     if(e.matches('ul,ol'))return {type:'list',ordered:e.tagName==='OL',start:parseInt(e.getAttribute('start')||'1'),items:[...e.children].filter(c=>c.tagName==='LI').map(c=>({...rich(c),style:style(c)})),style:style(e)};
     const list=e.querySelector('ul,ol'),li=list?.querySelector('li'),marker=/^H/.test(e.tagName)&&li&&norm(li.textContent)===norm(e.textContent)?{type:getComputedStyle(li).listStyleType,indent:parseFloat(getComputedStyle(list).paddingLeft)||25}:undefined;
     return {type:/^H/.test(e.tagName)?'heading':'paragraph',...(/^H/.test(e.tagName)?{level:parseInt(e.tagName.slice(1))}:{}),...rich(e),style:style(e),...(marker?{marker}:{})};
    }).filter(b=>b.type==='list'?b.items.length:b.text);
   };
   const root=document.querySelector('[data-elementor-type="wp-page"]')||document.querySelector('main');
   const widgets=[...root.querySelectorAll('[data-widget_type]')].map(w=>{
    const kind=w.dataset.widget_type;
    const s=getComputedStyle(w),section=w.closest('section.elementor-top-section');
    const image=w.querySelector('img');
    const imageInfo=image?{src:image.currentSrc||image.src,alt:image.alt,box:box(image),radius:parseFloat(getComputedStyle(image).borderRadius),fit:getComputedStyle(image).objectFit}:null;
    const folding=kind==='accordion.default'||kind==='toggle.default';
    const accordions=folding?[...w.querySelectorAll('.elementor-accordion-item,.elementor-toggle-item')].map(a=>{const title=a.querySelector('.elementor-accordion-title,.elementor-toggle-title');return {title:norm(title?.textContent),titleStyle:title?style(title):null,blocks:blocks(a.querySelector('.elementor-tab-content')),open:a.querySelector('.elementor-tab-title')?.getAttribute('aria-expanded')==='true'};}):[];
    return {id:w.dataset.id,kind,text:norm(w.innerText),sectionId:section?.dataset.id,box:box(w),padding:s.padding,margin:s.margin,background:s.backgroundColor,radius:s.borderRadius,shadow:s.boxShadow,blocks:folding?[]:blocks(w),accordions,image:imageInfo};
   });
   return {slug,widgets,sections:[...root.querySelectorAll('section.elementor-top-section')].map(e=>{const s=getComputedStyle(e);return {id:e.dataset.id,box:box(e),padding:s.padding,margin:s.margin,bg:s.backgroundColor,background:s.backgroundImage,attachment:s.backgroundAttachment,position:s.backgroundPosition};})};
  },slug));
 }
 return out;
}
