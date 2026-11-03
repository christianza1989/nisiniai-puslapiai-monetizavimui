'use client';
import {useMemo,type ComponentProps} from 'react';
import ViewerCore,{type Assembly as CoreAssembly} from './viewer-3d-core';
import {renderMaterial,type FinishPreview} from '@/lib/render-materials';
import {tagViewerUpholstery} from '@/lib/viewer-upholstery';
import {tagChairSurfaces,createChairColorMaterials,createChairColorApplication} from '@/lib/chair-color-materials';
const chairAdapter={tag:tagChairSurfaces,materials:createChairColorMaterials,application:createChairColorApplication};
export type Assembly=Omit<CoreAssembly,'finishes'>&{finishes:Record<string,FinishPreview>};
type Props=Omit<ComponentProps<typeof ViewerCore>,'assembly'|'sourceRoles'|'chairAdapter'>&{assembly?:Assembly};
const textile=new Set(['CSE','MT','RX','SD','SC','SY','ST','CN','ME','CUR','ERA','X','YS','YB']);
/** Authenticated legacy adapter. Common renderer has no supplier palette dependency. */
export default function Viewer3D({assembly,...props}:Props){
 const projected=useMemo(()=>assembly?{...assembly,finishes:Object.fromEntries(Object.entries(assembly.finishes).map(([key,finish])=>[key,{...renderMaterial(finish),sheen:finish.group&&textile.has(finish.group)?.12:0}]))}:undefined,[assembly]);
 return <ViewerCore {...props} assembly={projected} sourceRoles={tagViewerUpholstery} chairAdapter={chairAdapter}/>;
}
