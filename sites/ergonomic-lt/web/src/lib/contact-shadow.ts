import {Box3,Vector3,Color,Scene,OrthographicCamera,PlaneGeometry,Mesh,MeshBasicMaterial,
  ShaderMaterial,WebGLRenderTarget,DoubleSide,UniformsUtils,type Object3D,type WebGLRenderer} from 'three';
import {HorizontalBlurShader} from 'three/addons/shaders/HorizontalBlurShader.js';
import {VerticalBlurShader} from 'three/addons/shaders/VerticalBlurShader.js';
import {visibleBounds} from './viewer-camera';

// Cache a height-attenuated projection of the actual assembly onto its floor.
// No per-frame shadow rendering is needed when the camera rotates.
export function contactShadow(renderer:WebGLRenderer,scene:Scene,object:Object3D){
  object.updateMatrixWorld(true);
  const box=visibleBounds(object),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
  const extent=Math.max(size.x,size.z)*1.45,resolution=512;
  const a=new WebGLRenderTarget(resolution,resolution),b=new WebGLRenderTarget(resolution,resolution);
  const camera=new OrthographicCamera(-extent/2,extent/2,extent/2,-extent/2,.01,size.y+1);
  camera.position.set(center.x,box.max.y+.5,center.z);camera.up.set(0,0,-1);camera.lookAt(center.x,box.min.y,center.z);
  const projection=new ShaderMaterial({side:DoubleSide,uniforms:{floor:{value:box.min.y}},
    vertexShader:'varying float height; uniform float floor; void main(){ vec4 world=modelMatrix*vec4(position,1.0); height=max(world.y-floor,0.0); gl_Position=projectionMatrix*viewMatrix*world; }',
    fragmentShader:'varying float height; void main(){gl_FragColor=vec4(0.0,0.0,0.0,0.5*exp(-height*4.0));}'});
  const previousTarget=renderer.getRenderTarget(),background=scene.background,override=scene.overrideMaterial;
  const clear=renderer.getClearColor(new Color()).clone(),clearAlpha=renderer.getClearAlpha();
  const shadowEnabled=renderer.shadowMap.enabled;renderer.shadowMap.enabled=false;
  scene.background=null;scene.overrideMaterial=projection;renderer.setClearColor(0x000000,0);renderer.setRenderTarget(a);renderer.clear();renderer.render(scene,camera);
  scene.background=background;scene.overrideMaterial=override;
  const blurScene=new Scene(),blurCamera=new OrthographicCamera(-1,1,1,-1,0,2);
  blurCamera.position.z=1;
  const horizontal=new ShaderMaterial({...HorizontalBlurShader,uniforms:UniformsUtils.clone(HorizontalBlurShader.uniforms),depthTest:false,depthWrite:false});
  const vertical=new ShaderMaterial({...VerticalBlurShader,uniforms:UniformsUtils.clone(VerticalBlurShader.uniforms),depthTest:false,depthWrite:false});
  const quad=new Mesh(new PlaneGeometry(2,2),horizontal);blurScene.add(quad);
  horizontal.uniforms.tDiffuse.value=a.texture;horizontal.uniforms.h.value=2.5/resolution;
  renderer.setRenderTarget(b);renderer.clear();renderer.render(blurScene,blurCamera);
  quad.material=vertical;vertical.uniforms.tDiffuse.value=b.texture;vertical.uniforms.v.value=2.5/resolution;
  renderer.setRenderTarget(a);renderer.clear();renderer.render(blurScene,blurCamera);
  renderer.setRenderTarget(previousTarget);renderer.setClearColor(clear,clearAlpha);
  renderer.shadowMap.enabled=shadowEnabled;renderer.shadowMap.needsUpdate=true;
  const floor=new Mesh(new PlaneGeometry(extent,extent),new MeshBasicMaterial({map:a.texture,transparent:true,depthWrite:false,toneMapped:false}));
  floor.rotation.x=-Math.PI/2;floor.position.set(center.x,box.min.y-.002,center.z);scene.add(floor);
  projection.dispose();horizontal.dispose();vertical.dispose();quad.geometry.dispose();b.dispose();
  return ()=>{scene.remove(floor);floor.geometry.dispose();floor.material.dispose();a.dispose();};
}
