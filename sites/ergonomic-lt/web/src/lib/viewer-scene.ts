export const backgroundPresets = {
  studio: {label:'Šviesus studijos',color:'#f3f4f1'},
  white: {label:'Baltas',color:'#ffffff'},
  sand: {label:'Smėlio',color:'#e8ded0'},
  graphite: {label:'Grafito',color:'#323833'},
} as const;
export const lightingPresets = {
  neutral: {label:'Dienos šviesa',environment:.55,ambient:.22,key:1.5,fill:.25,keyColor:'#ffffff',fillColor:'#ffffff',ground:'#e5e7e2',position:[3,5,4]},
  soft: {label:'Minkšta studija',environment:.75,ambient:.3,key:.95,fill:.4,keyColor:'#ffffff',fillColor:'#ffffff',ground:'#e5e7e2',position:[3,5,4]},
  warm: {label:'Šiltas kambarys',environment:.5,ambient:.2,key:1.5,fill:.3,keyColor:'#ffe2bd',fillColor:'#fff1df',ground:'#ded1bc',position:[3,5,4]},
  side: {label:'Šoninis langas',environment:.35,ambient:.16,key:2,fill:.15,keyColor:'#ffffff',fillColor:'#e3ecff',ground:'#cdd4d0',position:[-4,3,2]},
} as const;
export type SceneSettings = {background:keyof typeof backgroundPresets|'custom';color:string;lighting:keyof typeof lightingPresets;brightness:number;direction:number};
// One product presentation for every configurator; customer browser preferences
// do not override it. The separate approved homepage demo keeps its own scene.
export const productSceneSettings:Readonly<SceneSettings> = Object.freeze({background:'white',color:'#ffffff',lighting:'side',brightness:100,direction:45});
export const defaultSceneSettings:SceneSettings = {background:'studio',color:'#f3f4f1',lighting:'neutral',brightness:100,direction:0};
export const sceneStorageKey='ergonomic.viewer-scene.v1';

// Browser preferences are untrusted and may have been written by an older version.
export function readSceneSettings(value:unknown):SceneSettings {
  if(!value||typeof value!=='object'||Array.isArray(value))return {...defaultSceneSettings};
  const saved=value as Record<string,unknown>;
  return {
    background:typeof saved.background==='string'&&(Object.hasOwn(backgroundPresets,saved.background)||saved.background==='custom')?saved.background as SceneSettings['background']:'studio',
    color:typeof saved.color==='string'&&/^#[0-9a-f]{6}$/i.test(saved.color)?saved.color.toLowerCase():defaultSceneSettings.color,
    lighting:typeof saved.lighting==='string'&&Object.hasOwn(lightingPresets,saved.lighting)?saved.lighting as SceneSettings['lighting']:'neutral',
    brightness:typeof saved.brightness==='number'&&Number.isFinite(saved.brightness)?Math.max(60,Math.min(160,Math.round(saved.brightness/5)*5)):100,
    direction:typeof saved.direction==='number'&&Number.isFinite(saved.direction)?Math.max(0,Math.min(360,Math.round(saved.direction/15)*15)):0,
  };
}
export function sceneBackground(settings:SceneSettings){return settings.background==='custom'?settings.color:backgroundPresets[settings.background].color;}
