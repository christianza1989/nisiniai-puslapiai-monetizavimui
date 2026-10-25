'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {useEffect,useRef} from 'react';
import revision from '../../content/editorial/active-revision.json';

export function ApprovedHomeInteractive({children}:{children:React.ReactNode}){
  const host=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const root=host.current;
    if(!root)return;
    let mounted=true;
    const disposers:(()=>void)[]=[];
    const carousels='/media/home-final/carousels.js?v='+revision.revision;
    const demo='/media/home-final/demo.js?v='+revision.revision;
    void import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ carousels).then(module=>{
      if(!mounted)return;
      for(const mount of [module.mountCategories,module.mountGuides]){
        const dispose=mount(root);
        if(typeof dispose==='function')disposers.push(dispose);
      }
    }).catch(()=>{});
    void import(/* webpackIgnore: true */ /* turbopackIgnore: true */ /* @vite-ignore */ demo).then(module=>{
      if(!mounted)return;
      const dispose=module.mountDemo(root);
      if(typeof dispose==='function')disposers.push(dispose);
    }).catch(()=>{
      const status=root.querySelector<HTMLElement>('.hp-demo-status');
      if(status){status.textContent=copyText("ui.b140f92943b63a2344c8","3D peržiūros nepavyko įkelti. Atidarykite visą konfigūratorių.");status.hidden=false;status.setAttribute('role','alert');}
    });
    return ()=>{mounted=false;disposers.reverse().forEach(dispose=>dispose());};
  },[]);
  return <div className="approved-home" ref={host}>{children}</div>;
}
