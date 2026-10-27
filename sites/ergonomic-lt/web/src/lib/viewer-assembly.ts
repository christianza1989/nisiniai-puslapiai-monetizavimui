import type {Asset,Patch} from './expanded-configurator';

export type GeometryAssembly={base:Asset|null;patches:Patch[]};

/** A measured component assembly may have no shared invariant mesh. */
export function hasAssemblyGeometry(assembly:GeometryAssembly){
 return !!assembly.base||assembly.patches.some(p=>(p.geometries||(p.geometry?[p.geometry]:[])).length>0);
}

/** An explicit null base must never load the legacy anchor as a substitute. */
export function viewerBaseAsset(variant:Asset,assembly?:GeometryAssembly):Asset|null{
 return assembly?assembly.base:variant;
}
