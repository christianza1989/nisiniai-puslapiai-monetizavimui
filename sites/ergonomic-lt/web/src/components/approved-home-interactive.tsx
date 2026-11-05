'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {useEffect,useRef} from 'react';
import revision from '../../content/editorial/active-revision.json';
import {activateProductViewerWhenNear} from '@/lib/viewer-activation';

export function ApprovedHomeInteractive({children,customerDemo=false}:{children:React.ReactNode;customerDemo?:boolean}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=host.current;
    if(!root)return;
    let mounted=true;
    const disposers:(()=>void)[]=[];
    const carousels='/media/home-final/carousels.js?v='+revision.revision;
    const demo='/media/home-final/demo.js?v='+revision.revision;
    // Warm the small control module, but don't let its eager image decoding
    // compete with the hero before the visitor reaches either carousel.
    const carouselModule=import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ carousels);
    void carouselModule.catch(()=>{});
    function defer(element:HTMLElement|null,load:()=>Promise<unknown>,failed:()=>void=()=>{}){
      if(element)disposers.push(activateProductViewerWhenNear(element,()=>{void load().catch(failed);}));
    }
    for(const [element,name] of [[root.querySelector<HTMLElement>('.hp-category-section'),'mountCategories'],[root.querySelector('.hp-guide-track')?.closest('section'),'mountGuides']] as const){
      defer(element||null,async()=>{
        const module=await carouselModule;if(!mounted)return;
        const dispose=module[name](root);if(typeof dispose==='function')disposers.push(dispose);
      });
    }
    defer(root.querySelector<HTMLElement>('.hp-demo-layout'),async()=>{
      if(customerDemo){const[module,response]=await Promise.all([import('@/lib/public-home-demo'),fetch('/api/customer-home-demo/')]);if(!response.ok)throw Error('Demonstration unavailable');const data=await response.json();if(!mounted)return;const dispose=module.mountDemo(root,data);if(typeof dispose==='function')disposers.push(dispose);return;}
      const module=await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ demo);
      if(!mounted)return;
      const dispose=module.mountDemo(root);if(typeof dispose==='function')disposers.push(dispose);
    },()=>{
      if(!mounted)return;
      const status=root.querySelector<HTMLElement>('.hp-demo-status');
      if(status){status.textContent=copyText("ui.b140f92943b63a2344c8","3D peržiūros nepavyko įkelti. Atidarykite visą konfigūratorių.");status.hidden=false;status.setAttribute('role','alert');}
    });
    return ()=>{mounted=false;disposers.reverse().forEach(dispose=>dispose());};
  },[customerDemo]);
  return <div className="approved-home" ref={host}>{children}</div>;
}
