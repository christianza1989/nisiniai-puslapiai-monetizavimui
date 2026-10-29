'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,RotateCw,ZoomIn,ZoomOut,Scan,Focus,Maximize} from 'lucide-react';
import {Scene,Color,PerspectiveCamera,WebGLRenderer,HemisphereLight,DirectionalLight,
  Mesh,Group,PMREMGenerator,MeshStandardMaterial,TextureLoader,RepeatWrapping,Box3,Vector2,Vector3,Raycaster,SRGBColorSpace,NoColorSpace,NeutralToneMapping,PCFShadowMap,type WebGLRenderTarget,type Object3D,type Material,type Texture} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import type {PilotVariant} from '@/lib/configurator';
import type {Asset,Patch} from '@/lib/expanded-configurator';
import {renderMaterial,type FinishPreview} from '@/lib/render-materials';
import {contactShadow} from '@/lib/contact-shadow';
import {isolateFinishMaterials} from '@/lib/finish-materials';
import {visibleMeshes,visibleBounds,cameraFrame,cameraNear,unobstructedCameraViewport} from '@/lib/viewer-camera';
import {finishField,physicalUpholstery,setFabricSheen,copyTexturePlacement} from '@/lib/viewer-materials';
import {lightingPresets,productSceneSettings,type SceneSettings} from '@/lib/viewer-scene';
import {roomEnvironment,productShowroom} from '@/lib/showroom';
import type {DeskColors,DeskColorPlan} from '@/lib/desk-colors';
import {tagDeskSurfaces,createDeskColorMaterials,createDeskColorApplication} from '@/lib/desk-color-materials';
import {viewerBaseAsset} from '@/lib/viewer-assembly';
import type {ChairPreview} from '@/lib/chair-preview';
import type {ChairColorPlan} from '@/lib/chair-color-admission';
import {tagChairSurfaces,createChairColorMaterials,createChairColorApplication} from '@/lib/chair-color-materials';

function disposeObject(root:Object3D){
  const materials=new Set<Material>(),textures=new Set<Texture>();root.traverse(o=>{if(o instanceof Mesh){o.geometry.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});
  materials.forEach(m=>{if(m instanceof MeshStandardMaterial)for(const texture of [m.map,m.normalMap,m.roughnessMap,m.metalnessMap])if(texture)textures.add(texture);m.dispose();});textures.forEach(t=>t.dispose());
}
type Action='left'|'right'|'in'|'out'|'reset'|'surface';
export type Assembly={base:Asset|null;patches:Patch[];finishes:Record<string,FinishPreview>;deskColors?:{source:DeskColors;plan:DeskColorPlan};chairColors?:{source:ChairPreview;plan:ChairColorPlan}};
export default function Viewer3D({variant,name,assembly,fullscreen=false,onFullscreen,avoidToolbarOverlap=false}:{variant:PilotVariant;name:string;assembly?:Assembly;fullscreen?:boolean;onFullscreen?:()=>void;avoidToolbarOverlap?:boolean}){
  const stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),action=useRef<(a:Action)=>void>(()=>{});
  const [state,setState]=useState<'loading'|'ready'|'error'>('loading'),[attempt,setAttempt]=useState(0);
  const [colorState,setColorState]=useState<'original'|'loading'|'ready'|'error'>('original');
  const deskColors=useRef(assembly?.deskColors),applyDeskColors=useRef<()=>Promise<void>>(async()=>{});deskColors.current=assembly?.deskColors;
  const chairColors=useRef(assembly?.chairColors),applyChairColors=useRef<()=>Promise<void>>(async()=>{});chairColors.current=assembly?.chairColors;
  const finishes=useRef(assembly?.finishes),applyFinishes=useRef<()=>void>(()=>{});finishes.current=assembly?.finishes;
  const baseAsset=viewerBaseAsset(variant,assembly);
  const geometryKey=JSON.stringify([baseAsset?.asset,baseAsset?.assetSha256,assembly?.patches.map(p=>[p.remove,p.geometry?.assetSha256,p.geometries?.map(g=>g.assetSha256)]),assembly?.deskColors?.plan.assets.map(a=>a.assetSha256)]);
  useEffect(()=>{applyFinishes.current();},[assembly?.finishes]);
  useEffect(()=>{void applyDeskColors.current();},[assembly?.deskColors]);
  useEffect(()=>{void applyChairColors.current();},[assembly?.chairColors]);
  useEffect(()=>{
    const host=stage.current,element=canvas.current;if(!host||!element)return;
    let disposed=false,object:Object3D|undefined,renderer:WebGLRenderer|undefined,disposeShadow:undefined|(()=>void);
    let colorMaterials:ReturnType<typeof createDeskColorMaterials>|undefined,colorApplication:ReturnType<typeof createDeskColorApplication>|undefined,colorRevision=0,colorFailed=false;
    let chairMaterials:ReturnType<typeof createChairColorMaterials>|undefined,chairApplication:ReturnType<typeof createChairColorApplication>|undefined;
    const chairExtras=new Map<string,Object3D>(),chairExtraLoads=new Map<string,Promise<Object3D>>();
    let chairShapeKey='[[],[]]';
    const abort=new AbortController(),scene=new Scene();scene.background=new Color(productSceneSettings.color);
    setState('loading');
    try{renderer=new WebGLRenderer({canvas:element,antialias:true,alpha:false,powerPreference:'high-performance'});}
    catch{setState('error');return;}
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=SRGBColorSpace;
    renderer.toneMapping=NeutralToneMapping;renderer.toneMappingExposure=1;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=PCFShadowMap;renderer.shadowMap.autoUpdate=false;
    const pmrem=new PMREMGenerator(renderer),environments=new Map<SceneSettings['lighting'],WebGLRenderTarget>();
    let roomSurfaces:ReturnType<typeof productShowroom>|undefined;
    const camera=new PerspectiveCamera(35,1,.002,50),controls=new OrbitControls(camera,element);
    let framingAspect=1;
    controls.enablePan=true;controls.screenSpacePanning=true;controls.zoomToCursor=true;controls.zoomSpeed=.75;
    controls.enableDamping=false;controls.autoRotate=false;
    controls.minPolarAngle=.15;controls.maxPolarAngle=Math.PI*.49;controls.enabled=false;
    const ambient=new HemisphereLight('#ffffff','#e5e7e2',.3);scene.add(ambient);
    const light=new DirectionalLight('#ffffff',1.6);light.position.set(3,5,4);scene.add(light);
    const fill=new DirectionalLight('#ffffff',.4);fill.position.set(-3,2,-3);scene.add(fill);
    const render=()=>{if(!disposed&&renderer){camera.near=cameraNear(camera.position.distanceTo(controls.target));camera.updateProjectionMatrix();renderer.render(scene,camera);}};
    function applyScene(){
      const settings=productSceneSettings,preset=lightingPresets[settings.lighting];
      (scene.background as Color).set(settings.color);
      let environment=environments.get(settings.lighting);
      if(!environment){const room=roomEnvironment(settings.lighting);environment=pmrem.fromScene(room,.04);environments.set(settings.lighting,environment);room.dispose();}
      scene.environment=environment.texture;scene.environmentRotation.y=settings.direction*Math.PI/180;
      const strength=settings.brightness/100;scene.environmentIntensity=preset.environment*strength;
      ambient.intensity=preset.ambient*strength;ambient.color.set(preset.fillColor);ambient.groundColor.set(preset.ground);
      light.intensity=preset.key*strength;light.color.set(preset.keyColor);
      light.position.copy(roomSurfaces?roomSurfaces.position(preset.position,settings.direction):new Vector3().fromArray(preset.position));
      fill.intensity=preset.fill*strength;fill.color.set(preset.fillColor);
      renderer!.shadowMap.needsUpdate=true;render();
    }
    applyScene();
    const textures=new Map<string,Texture>(),textureLoader=new TextureLoader(),originals=new Map<MeshStandardMaterial,{map:Texture|null;normal:Texture|null;color:Color;roughness:number;metalness:number}>();
    function textureMap(url:string,normal:boolean,transform:Texture|null){
      const key=url+'|'+normal+'|'+JSON.stringify([transform?.repeat.toArray(),transform?.offset.toArray(),transform?.center.toArray(),transform?.rotation,transform?.channel,transform?.wrapS,transform?.wrapT,transform?.matrix.toArray()]);let texture=textures.get(key);
      if(!texture){texture=textureLoader.load(url,()=>render());texture.colorSpace=normal?NoColorSpace:SRGBColorSpace;texture.flipY=false;
        texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=renderer!.capabilities.getMaxAnisotropy();
        copyTexturePlacement(texture,transform);textures.set(key,texture);}
      return texture;
    }
    applyFinishes.current=()=>{
      if(!object||!finishes.current)return;
      object.traverse(o=>{if(!(o instanceof Mesh))return;const field=finishField(o);
        if(!field)return;
        const finish=finishes.current?.[field];if(!finish)return;
        for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof MeshStandardMaterial){
          if(!originals.has(material))originals.set(material,{map:material.map,normal:material.normalMap,color:material.color.clone(),roughness:material.roughness,metalness:material.metalness});
          const original=originals.get(material)!,preview=renderMaterial(finish);
          material.map=preview.image?textureMap(preview.image,false,original.map):null;
          material.normalMap=preview.normalImage?textureMap(preview.normalImage,true,original.normal||original.map):original.normal;
          if('factor' in preview&&preview.factor)material.color.fromArray(preview.factor);else if(!preview.approximate)material.color.copy(original.color);else material.color.set(preview.color);
          material.roughness='roughness' in preview&&typeof preview.roughness==='number'?preview.roughness:original.roughness;
          material.metalness='metalness' in preview&&typeof preview.metalness==='number'?preview.metalness:original.metalness;
          setFabricSheen(material,finish.group);
          material.needsUpdate=true;
        }
      });render();
    };
    function fit(){
      const box=object?visibleBounds(object):new Box3(new Vector3(-1,0,-1),new Vector3(1,2,1));
      const {center,distance,near,minimum,maximum}=cameraFrame(box,framingAspect,camera.fov);
      controls.target.copy(center);camera.position.copy(center).add(new Vector3(2.6,1.25,3.7).normalize().multiplyScalar(distance));
      camera.near=near;camera.updateProjectionMatrix();controls.minDistance=minimum;controls.maxDistance=maximum;
      controls.cursor.copy(center);controls.maxTargetRadius=box.getSize(new Vector3()).length();controls.update();controls.saveState();render();
    }
    const raycaster=new Raycaster();
    function inspect(point:Vector3){
      if(!object)return;const offset=camera.position.clone().sub(point).normalize();
      controls.target.copy(point);camera.position.copy(point).add(offset.multiplyScalar(Math.max(.18,visibleBounds(object).getSize(new Vector3()).y*.16)));
      controls.update();render();
    }
    const inspectPointer=(event:MouseEvent)=>{if(!object||!controls.enabled)return;
      const rect=element.getBoundingClientRect();raycaster.setFromCamera(new Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
      const hit=raycaster.intersectObjects(visibleMeshes(object),false)[0];if(hit)inspect(hit.point);
    };
    element.addEventListener('dblclick',inspectPointer);
    const resize=()=>{const {width,height}=host.getBoundingClientRect();if(width<=0||height<=0)return;
      const previousAspect=framingAspect;renderer!.setSize(width,height,false);camera.aspect=width/height;
      const rect=host.getBoundingClientRect(),toolbar=host.parentElement?.querySelector('.viewer-toolbar')?.getBoundingClientRect();
      const rightInset=avoidToolbarOverlap&&toolbar&&toolbar.left>rect.left+width/2&&toolbar.bottom>rect.top&&toolbar.top<rect.bottom?rect.right-toolbar.left+8:0;
      const viewport=unobstructedCameraViewport(width,height,rightInset);framingAspect=viewport.aspect;
      if(viewport.inset)camera.setViewOffset(width,height,viewport.offsetX,0,width,height);else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      if(controls.enabled&&object){
        const box=visibleBounds(object),offset=camera.position.clone().sub(controls.target);
        const previous=cameraFrame(box,previousAspect,camera.fov,offset).distance,next=cameraFrame(box,framingAspect,camera.fov,offset).distance;
        // Preserve the visitor's angle, pan and relative zoom on viewport
        // resize while adapting the framing to the changed aspect ratio.
        if(previous>0)camera.position.copy(controls.target).add(offset.multiplyScalar(next/previous));
        controls.update();render();
      }else fit();};
    const observer=new ResizeObserver(resize);observer.observe(host);resize();
    controls.addEventListener('change',render);
    action.current=(a)=>{if(!object||!controls.enabled)return;
      if(a==='reset'){controls.reset();render();return;}
      if(a==='surface'){
        const surfaces=visibleMeshes(object).filter(mesh=>/CUPHBACKRESTCOLOR|CUPHCOLOR|CUPHSEATCOLOR/.test(finishField(mesh)||''));
        const mesh=surfaces.sort((a,b)=>{const size=(m:Mesh)=>new Box3().setFromObject(m,true).getSize(new Vector3()).length();return size(b)-size(a);})[0];
        if(mesh){const center=new Box3().setFromObject(mesh,true).getCenter(new Vector3());raycaster.set(camera.position,center.clone().sub(camera.position).normalize());
          const hit=raycaster.intersectObject(mesh,false)[0];if(hit)inspect(hit.point);}
        return;
      }
      if(a==='left'||a==='right'){const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new Vector3(0,1,0),a==='left'?Math.PI/8:-Math.PI/8);camera.position.copy(controls.target).add(offset);}
      else{const offset=camera.position.clone().sub(controls.target),distance=offset.length();
        offset.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,distance*(a==='in'?.82:1.22))));camera.position.copy(controls.target).add(offset);}
      controls.update();render();
    };
    const contextLost=(event:Event)=>{event.preventDefault();controls.enabled=false;setState('error');};
    element.addEventListener('webglcontextlost',contextLost);
    const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    (async()=>{
      try{
        async function load(asset:Asset){const response=await fetch(asset.asset+'?v='+asset.assetSha256.slice(0,12),{signal:abort.signal});
        if(!response.ok)throw Error(copyText("ui.acd2f775d28e2afadd69","Asset unavailable"));
        const bytes=await response.arrayBuffer();if(bytes.byteLength>32_000_000)throw Error(copyText("ui.45d9a6bdd6b3cc360e15","Asset too large"));
        if(deskColors.current||chairColors.current){const digest=await crypto.subtle.digest('SHA-256',bytes);const sha=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');if(sha!==asset.assetSha256||chairColors.current&&bytes.byteLength!==asset.bytes)throw Error('Component bytes changed');}
        const gltf=await loader.parseAsync(bytes,'');if(deskColors.current)tagDeskSurfaces(gltf.scene,gltf.parser.associations as Map<Object3D,{nodes?:number;primitives?:number}>,asset.assetSha256);if(chairColors.current)tagChairSurfaces(gltf.scene,gltf.parser.associations as Map<Object3D,{nodes?:number;primitives?:number}>,chairColors.current.source,asset.assetSha256);return gltf.scene;}
        object=new Group();if(baseAsset)object.add(await load(baseAsset));
        if(assembly){
          for(const patch of assembly.patches){for(const id of patch.remove){const part=object.getObjectByName(id);if(part)part.visible=false;}
            const refs=patch.geometries|| (patch.geometry?[patch.geometry]:[]);
            const loaded=await Promise.allSettled(refs.map(load));
            if(loaded.some(result=>result.status==='rejected')){
              for(const result of loaded)if(result.status==='fulfilled')disposeObject(result.value);
              throw Error(copyText("ui.73712234a32ced3d2a60","Component unavailable"));
            }
            for(const result of loaded)if(result.status==='fulfilled'){if(disposed){disposeObject(result.value);continue;}object.add(result.value);}}
        }
        for(const asset of deskColors.current?.plan.assets||[])object.add(await load(asset));
        if(disposed){disposeObject(object);return;}
        if(!chairColors.current){isolateFinishMaterials(object);physicalUpholstery(object);}
        object.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof MeshStandardMaterial){for(const texture of [material.map,material.normalMap])if(texture)texture.anisotropy=renderer!.capabilities.getMaxAnisotropy();}}});
        scene.add(object);disposeShadow=contactShadow(renderer!,scene,object);
        roomSurfaces=productShowroom(object,light);scene.add(roomSurfaces.group,roomSurfaces.target);applyScene();applyFinishes.current();
        if(deskColors.current){colorMaterials=createDeskColorMaterials(deskColors.current.source);colorApplication=createDeskColorApplication(object);
          applyDeskColors.current=async()=>{if(!deskColors.current||!colorApplication||!colorMaterials||disposed)return;const revision=++colorRevision;colorFailed=false;setColorState('loading');try{const applied=await colorApplication.apply(deskColors.current.plan,colorMaterials.get);if(applied&&!disposed&&revision===colorRevision){renderer!.shadowMap.needsUpdate=true;render();setColorState('ready');}}catch{if(!disposed&&revision===colorRevision){colorFailed=true;setColorState('error');setState('error');}}};
          await applyDeskColors.current();
          if(colorFailed)return;
        }else if(chairColors.current){
          chairMaterials=createChairColorMaterials(chairColors.current.source);chairApplication=createChairColorApplication(object);
          applyChairColors.current=async()=>{
            if(!chairColors.current||!chairMaterials||!chairApplication||disposed||!object)return;
            const revision=++colorRevision,plan=chairColors.current.plan;colorFailed=false;setColorState('loading');
            try{
              const wanted=plan.assets||[];
              await Promise.all(wanted.map(asset=>{
                let pending=chairExtraLoads.get(asset.assetSha256);
                if(!pending){pending=load(asset).then(group=>{if(disposed){disposeObject(group);throw Error('Chair view closed');}group.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;}});chairExtras.set(asset.assetSha256,group);chairApplication!.register(group);return group;});chairExtraLoads.set(asset.assetSha256,pending);}
                return pending;
              }));
              if(disposed||revision!==colorRevision)return;
              for(const [sha,group]of chairExtras){if(wanted.some(a=>a.assetSha256===sha))object.add(group);else group.removeFromParent();}
              const applied=await chairApplication.apply(plan,chairMaterials.get);
              if(applied&&!disposed&&revision===colorRevision){
                const nextShape=JSON.stringify([wanted.map(a=>a.assetSha256).sort(),(plan.hidden||[]).map(t=>t.assetSha256+':'+t.selectorId).sort()]);
                if(nextShape!==chairShapeKey){disposeShadow?.();disposeShadow=contactShadow(renderer!,scene,object);chairShapeKey=nextShape;}
                renderer!.shadowMap.needsUpdate=true;render();setColorState('ready');
              }
            }catch{if(!disposed&&revision===colorRevision){chairApplication.resetOriginal();for(const group of chairExtras.values())group.removeFromParent();disposeShadow?.();disposeShadow=contactShadow(renderer!,scene,object);chairShapeKey='[[],[]]';colorFailed=true;render();setColorState('error');setState('error');}}
          };
          await applyChairColors.current();if(colorFailed)return;
        }else setColorState('original');
        if(disposed)return;controls.enabled=true;fit();setState('ready');
      }catch{if(!disposed&&!abort.signal.aborted)setState('error');}
    })();
    return()=>{disposed=true;colorRevision++;colorApplication?.dispose();colorMaterials?.dispose();chairApplication?.dispose();chairMaterials?.dispose();applyDeskColors.current=async()=>{};applyChairColors.current=async()=>{};abort.abort();observer.disconnect();element.removeEventListener('webglcontextlost',contextLost);element.removeEventListener('dblclick',inspectPointer);
      controls.removeEventListener('change',render);controls.dispose();disposeShadow?.();for(const group of chairExtras.values()){group.removeFromParent();disposeObject(group);}chairExtras.clear();disposeObject(scene);if(object&&!object.parent)disposeObject(object);textures.forEach(t=>t.dispose());originals.forEach(t=>{t.map?.dispose();t.normal?.dispose();});environments.forEach(environment=>environment.dispose());pmrem.dispose();light.shadow.dispose();renderer?.dispose();action.current=()=>{};applyFinishes.current=()=>{};};
  },[geometryKey,attempt,avoidToolbarOverlap]);
  return <div className="viewer-3d" data-state={state} data-color-state={colorState} data-variant={variant.id}>
    <div className="viewer-toolbar" role="group" aria-label="3D vaizdo valdymas">
      <button type="button" aria-label={copyText("ui.3931f10cc38ef591b0c7","Apžiūrėti apmušalą")} title={copyText("ui.3931f10cc38ef591b0c7","Apžiūrėti apmušalą")} disabled={state!=='ready'} onClick={()=>action.current('surface')}><Focus size={19}/></button>
      {([['left',copyText("ui.5c3c485515586cc12639","Pasukti į kairę"),RotateCcw],['right',copyText("ui.ab7dbedfb76277a890b1","Pasukti į dešinę"),RotateCw],['in','Priartinti',ZoomIn],['out','Atitolinti',ZoomOut],['reset',copyText("ui.42be950e649e30e5e02c","Pradinis vaizdas"),Scan]] as const).map(([a,label,Icon])=>
        <button key={a} type="button" aria-label={label} title={label} disabled={state!=='ready'} onClick={()=>action.current(a)}><Icon size={19}/></button>)}
      {onFullscreen&&<button type="button" aria-label={copyText("ui.dd2884c1a592a8fa25d0","Visas ekranas")} title={copyText("ui.dd2884c1a592a8fa25d0","Visas ekranas")} hidden={fullscreen} onClick={onFullscreen}><Maximize size={19}/></button>}
    </div>
    <div ref={stage} className="viewer-stage" aria-busy={state==='loading'}>
      <canvas key={geometryKey+attempt} ref={canvas} tabIndex={0} role="img" aria-label={copyText("ui.3b0c2ba761f32717f690","{{p0}} 3D modelis. Rodyklėmis pasukite, pliusu ir minusu keiskite mastelį, F apžiūrėkite apmušalą, Home atkurkite vaizdą.",{p0:(name)})}
        onKeyDown={e=>{const a:Action|undefined=e.key==='ArrowLeft'?'left':e.key==='ArrowRight'?'right':e.key==='+'||e.key==='='?'in':e.key==='-'?'out':e.key==='Home'?'reset':e.key.toLowerCase()==='f'?'surface':undefined;
          if(a){e.preventDefault();action.current(a);}}}/>
      {state==='loading'&&<p className="viewer-message" role="status">{copyText("ui.d1818a488c16805e4761","Įkeliamas 3D modelis…")}</p>}
      {state==='error'&&<div className="viewer-message" role="alert"><p>{copyText("ui.f4932f22135bf006a99b","Nepavyko parodyti 3D modelio. Bandykite dar kartą arba rinkitės nuotraukų peržiūrą.")}</p><button className="button outline" onClick={()=>setAttempt(n=>n+1)}>{copyText("ui.9b6dd1a2e70b58ac82ea","Bandyti dar kartą")}</button></div>}
    </div>
  </div>;
}
