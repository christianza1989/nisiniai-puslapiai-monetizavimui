
// editorial-copy-wired
import {copyText} from '../../src/lib/editorial-copy.ts';
import {Scene, Color, PerspectiveCamera, WebGLRenderer, HemisphereLight, DirectionalLight, Group, Mesh, MeshStandardMaterial, PMREMGenerator, TextureLoader, RepeatWrapping, SRGBColorSpace, NoColorSpace, NeutralToneMapping, PCFShadowMap, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createDemoState, changeDemoState, demoAssemblyKey, demoFinishCode} from './demo-state.mjs';
import demoAssets from './demo-assets.json';
import {physicalUpholstery, finishField, copyTexturePlacement, setFabricSheen} from '../../src/lib/viewer-materials.ts';
import {isolateFinishMaterials} from '../../src/lib/finish-materials.ts';
import {visibleBounds, cameraFrame} from '../../src/lib/viewer-camera.ts';
import {contactShadow} from '../../src/lib/contact-shadow.ts';
import {roomEnvironment, showroom} from '../../src/lib/showroom.ts';

const mountedRoots = new WeakMap();

/** Mount the isolated homepage illustration; the returned cleanup is idempotent. */
export function mountDemo(rootElement) {
  if (!rootElement?.querySelector) throw new TypeError(copyText("ui.7ea8414b9aea25b50efa","A homepage demo root is required"));
  mountedRoots.get(rootElement)?.();
  const section = rootElement.matches('#konfiguratorius') ? rootElement : rootElement.querySelector('#konfiguratorius') || rootElement;
  const host = section.querySelector('.hp-demo-stage');
  const canvas = host?.querySelector('canvas');
  const status = section.querySelector('.hp-demo-status');
  const rotate = section.querySelector('.hp-demo-rotation');
  const colors = section.querySelector('.hp-demo-swatches');
  const reset = section.querySelector('.hp-demo-reset');
  if (![host, canvas, status, rotate, colors, reset].every(Boolean)) throw new Error(copyText("ui.6b3a07db322a48b3a472","Homepage demo markup is incomplete"));

  const document = rootElement.ownerDocument;
  const view = document.defaultView;
  const listeners = new view.AbortController();
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  const textureLoader = new TextureLoader();
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textures = new Map();
  const cachedTextures = new Set();
  const textureErrors = new Set();
  const pendingAssemblies = new Set();
  const pendingParts = new Set();
  const disposedGeometries = new WeakSet();
  const disposedMaterials = new WeakSet();
  const disposedTextures = new WeakSet();
  let state = createDemoState();
  let object, renderer, controls, camera, scene, shadowCleanup, room, loadAbort, environmentTarget, keyLight;
  let preloadObserver, visibilityObserver, resizeObserver;
  let loadVersion = 0, frame = 0, lastTime = 0;
  let ready = false, started = false, disposed = false, inView = false, hover = false, focused = false, dragging = false;
  let rotating = !reduced.matches;
  const listen = (target, type, callback) => target.addEventListener(type, callback, {signal: listeners.signal});

  function setStatus(text, error = false) {
    if (disposed) return;
    status.textContent = text;
    status.hidden = !text;
    status.setAttribute('role', error ? 'alert' : 'status');
    host.setAttribute('aria-busy', text && !error ? 'true' : 'false');
  }

  function disposeTexture(map) {
    if (!map || disposedTextures.has(map)) return;
    disposedTextures.add(map);
    map.dispose();
    // GLTFLoader may create ImageBitmaps, whose CPU storage is separate from WebGL.
    map.source?.data?.close?.();
  }

  function disposeMaterial(material, maps) {
    if (!material) return;
    for (const value of Object.values(material)) if (value?.isTexture && !cachedTextures.has(value)) maps.add(value);
    for (const value of Object.values(material.userData.demoOriginal || {})) if (value?.isTexture && !cachedTextures.has(value)) maps.add(value);
    if (!disposedMaterials.has(material)) {
      disposedMaterials.add(material);
      material.dispose();
    }
  }

  function disposeObject(root) {
    if (!root) return;
    const maps = new Set();
    root.traverse(node => {
      if (!(node instanceof Mesh)) return;
      if (!disposedGeometries.has(node.geometry)) {
        disposedGeometries.add(node.geometry);
        node.geometry.dispose();
      }
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) disposeMaterial(material, maps);
    });
    maps.forEach(disposeTexture);
  }

  function materialSet(root) {
    const materials = new Set();
    root.traverse(node => {
      if (node instanceof Mesh) for (const material of Array.isArray(node.material) ? node.material : [node.material]) materials.add(material);
    });
    return materials;
  }

  function syncControls() {
    if (disposed) return;
    for (const button of colors.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.code === state.color));
    for (const button of section.querySelectorAll('button[data-armrests]')) button.setAttribute('aria-pressed', String(button.dataset.armrests === state.armrests));
    for (const button of section.querySelectorAll('button[data-headrest]')) button.setAttribute('aria-pressed', String((button.dataset.headrest === 'with') === state.headrest));
    for (const button of section.querySelectorAll('.hp-demo-controls button, .hp-demo-swatches button, button[data-armrests], button[data-headrest]')) button.disabled = false;
    rotate.disabled = reset.disabled = false;
    host.dataset.mode = 'example';
    host.dataset.headrest = String(state.headrest);
    host.dataset.armrests = state.armrests;
    host.dataset.color = state.color;
  }

  function shouldAnimate() {
    return !disposed && ready && rotating && !hover && !focused && !dragging && inView && !document.hidden;
  }

  function render() {
    if (!disposed && renderer && ready) {
      renderer.render(scene, camera);
      host.dataset.cameraAngle = controls.getAzimuthalAngle().toFixed(4);
    }
  }

  function schedule() {
    if (!shouldAnimate()) {
      if (frame) view.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      return;
    }
    if (frame) return;
    frame = view.requestAnimationFrame(time => {
      frame = 0;
      if (!shouldAnimate()) { lastTime = 0; return; }
      const delta = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0;
      lastTime = time;
      controls.autoRotate = true;
      controls.update(delta);
      controls.autoRotate = false;
      render();
      schedule();
    });
  }

  function syncRotation() {
    if (disposed) return;
    rotate.setAttribute('aria-pressed', String(rotating));
    rotate.setAttribute('aria-label', rotating ? copyText("ui.08883642c07d69782f52","Sustabdyti automatinį kėdės sukimąsi") : copyText("ui.db99855fd2d13683d8e8","Įjungti automatinį kėdės sukimąsi"));
    host.dataset.rotation = shouldAnimate() ? 'running' : 'paused';
    schedule();
  }

  function texture(url, normal, source) {
    const key = url + '|' + normal + '|' + JSON.stringify([source?.repeat.toArray(), source?.offset.toArray(), source?.rotation, source?.channel]);
    let map = textures.get(key);
    if (!map) {
      const retryUrl = textureErrors.has(key) ? url + (url.includes('?') ? '&' : '?') + 'retry=' + Date.now() : url;
      map = textureLoader.load(retryUrl, () => {
        if (disposed) { disposeTexture(map); return; }
        if (textures.get(key) !== map) return;
        textureErrors.delete(key);
        if (!textureErrors.size && host.dataset.textureError === 'true') { delete host.dataset.textureError; setStatus(''); }
        render();
      }, undefined, () => {
        disposeTexture(map);
        if (disposed || textures.get(key) !== map) return;
        textures.delete(key);
        textureErrors.add(key);
        host.dataset.textureError = 'true';
        setStatus(copyText("ui.7767b7eac191e7084108","Apmušalo tekstūra neįsikrovė. Spauskite „Atkurti vaizdą“ ir bandykite dar kartą."), true);
        render();
      });
      map.flipY = false;
      map.colorSpace = normal ? NoColorSpace : SRGBColorSpace;
      map.wrapS = map.wrapT = RepeatWrapping;
      map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      copyTexturePlacement(map, source);
      textures.set(key, map);
      cachedTextures.add(map);
    }
    return map;
  }

  function finishes() {
    if (disposed || !object) return;
    object.traverse(node => {
      if (!(node instanceof Mesh)) return;
      const code = demoFinishCode(state, finishField(node));
      if (!code) return;
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) if (material instanceof MeshStandardMaterial) {
        const base = material.userData.demoOriginal || {map: material.map, normal: material.normalMap, color: material.color.clone(), roughness: material.roughness, metalness: material.metalness};
        material.userData.demoOriginal = base;
        const preview = demoAssets.materials[code];
        material.map = preview.image ? texture(preview.image, false, base.map) : null;
        material.normalMap = preview.normalImage ? texture(preview.normalImage, true, base.normal || base.map) : base.normal;
        if (preview.factor) material.color.fromArray(preview.factor);
        else if (!preview.approximate) material.color.copy(base.color);
        else material.color.set(preview.color);
        material.roughness = preview.roughness ?? base.roughness;
        material.metalness = preview.metalness ?? base.metalness;
        setFabricSheen(material, 'VL');
        material.userData.demoFinishCode = code;
        material.needsUpdate = true;
      }
    });
    host.dataset.backrestColor = demoFinishCode(state, 'CUPHBACKRESTCOLOR');
    host.dataset.headrestColor = state.headrest ? demoFinishCode(state, 'CHEADRESTUPHCHCOLOR') : 'none';
    render();
  }

  function fit() {
    if (disposed || !object || !controls) return;
    const framing = cameraFrame(visibleBounds(object), camera.aspect, camera.fov);
    controls.target.copy(framing.center);
    camera.position.copy(framing.center).add(new Vector3(0, .32, 1).normalize().multiplyScalar(framing.distance * 1.12));
    camera.near = framing.near;
    camera.updateProjectionMatrix();
    controls.minDistance = framing.minimum;
    controls.maxDistance = framing.maximum;
    controls.cursor.copy(framing.center);
    controls.update();
    controls.saveState();
    render();
  }

  function removeAssembly() {
    shadowCleanup?.();
    shadowCleanup = undefined;
    if (room) { scene.remove(room.group, room.target); disposeObject(room.group); room = undefined; }
    if (object) { scene.remove(object); disposeObject(object); object = undefined; }
  }

  async function loadAssembly() {
    if (disposed || !renderer || !scene || !controls || !camera) return;
    const version = ++loadVersion;
    loadAbort?.abort();
    loadAbort = new view.AbortController();
    const signal = loadAbort.signal;
    const current = () => !disposed && version === loadVersion && !signal.aborted;
    const assembly = demoAssets.assemblies[demoAssemblyKey(state)];
    const next = new Group();
    pendingAssemblies.add(next);
    ready = false;
    controls.enabled = false;
    textureErrors.clear();
    delete host.dataset.textureError;
    setStatus(copyText("ui.d1818a488c16805e4761","Įkeliamas 3D modelis…"));
    host.dataset.state = 'loading';
    syncRotation();
    async function load(asset) {
      const response = await view.fetch(asset.asset + '?v=' + asset.assetSha256.slice(0, 12), {signal});
      if (!response.ok) throw new Error(copyText("ui.cc1a74a4f6639850352d","Model asset unavailable"));
      const bytes = await response.arrayBuffer();
      if (!current()) throw new Error(copyText("ui.8ff4f6bd3ac693a99304","Assembly load cancelled"));
      const gltf = await loader.parseAsync(bytes, '');
      // Parsing cannot be aborted. Dispose a late result before it reaches the DOM or scene.
      if (!current()) { disposeObject(gltf.scene); throw new Error(copyText("ui.8ff4f6bd3ac693a99304","Assembly load cancelled")); }
      pendingParts.add(gltf.scene);
      return gltf.scene;
    }
    try {
      const base = await load(assembly.base);
      pendingParts.delete(base);
      if (!current()) { disposeObject(base); throw new Error(copyText("ui.8ff4f6bd3ac693a99304","Assembly load cancelled")); }
      next.add(base);
      for (const patch of assembly.patches) {
        if (!current()) throw new Error(copyText("ui.8ff4f6bd3ac693a99304","Assembly load cancelled"));
        for (const id of patch.remove) { const part = next.getObjectByName(id); if (part) part.visible = false; }
        const additions = await Promise.allSettled((patch.geometries || (patch.geometry ? [patch.geometry] : [])).map(load));
        for (const result of additions) if (result.status === 'fulfilled') {
          pendingParts.delete(result.value);
          if (current()) next.add(result.value);
          else disposeObject(result.value);
        }
        if (!current()) throw new Error(copyText("ui.8ff4f6bd3ac693a99304","Assembly load cancelled"));
        if (additions.some(result => result.status === 'rejected')) throw new Error(copyText("ui.73712234a32ced3d2a60","Component unavailable"));
      }
      if (!current()) { disposeObject(next); return; }
      removeAssembly();
      object = next;
      const originals = materialSet(object);
      isolateFinishMaterials(object);
      physicalUpholstery(object);
      const activeMaterials = materialSet(object);
      // The shared helpers clone upholstery materials. Release superseded originals,
      // but retain their maps, which the clones still share until assembly disposal.
      for (const material of originals) if (!activeMaterials.has(material) && !disposedMaterials.has(material)) {
        material.dispose();
        disposedMaterials.add(material);
      }
      object.traverse(node => {
        if (!(node instanceof Mesh)) return;
        node.castShadow = node.receiveShadow = true;
        for (const material of Array.isArray(node.material) ? node.material : [node.material]) for (const map of [material.map, material.normalMap]) if (map) map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      });
      scene.add(object);
      shadowCleanup = contactShadow(renderer, scene, object);
      room = showroom(object, keyLight);
      scene.add(room.group, room.target);
      room.paint.color.set('#f3f4f1');
      room.wallPaint.color.set('#f3f4f1');
      keyLight.position.copy(room.position([3, 5, 4], 0));
      keyLight.shadow.intensity = .25;
      renderer.shadowMap.needsUpdate = true;
      ready = true;
      controls.enabled = true;
      finishes();
      fit();
      host.dataset.state = 'ready';
      host.dataset.meshCount = String(object.getObjectsByProperty('isMesh', true).filter(node => {
        for (let parent = node; parent; parent = parent.parent) if (!parent.visible) return false;
        return true;
      }).length);
      setStatus('');
      syncRotation();
    } catch {
      disposeObject(next);
      if (!current()) return;
      if (object === next) removeAssembly();
      ready = false;
      controls.enabled = false;
      syncRotation();
      host.dataset.state = 'error';
      setStatus(copyText("ui.711a6f7253deb46fe141","Nepavyko įkelti 3D modelio. Spauskite „Atkurti vaizdą“ ir bandykite dar kartą."), true);
    } finally {
      pendingAssemblies.delete(next);
    }
  }

  const controlStart = () => { dragging = true; syncRotation(); };
  const controlEnd = () => { dragging = false; syncRotation(); };

  function start() {
    if (disposed || started) return;
    started = true;
    try {
      renderer = new WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'high-performance'});
      renderer.setPixelRatio(Math.min(view.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = NeutralToneMapping;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = PCFShadowMap;
      renderer.shadowMap.autoUpdate = false;
      scene = new Scene();
      scene.background = new Color('#f3f4f1');
      camera = new PerspectiveCamera(35, 1, .002, 50);
      controls = new OrbitControls(camera, canvas);
      controls.enabled = false;
      controls.enableDamping = false;
      controls.enablePan = false;
      controls.zoomToCursor = true;
      controls.autoRotateSpeed = .7;
      controls.minPolarAngle = .15;
      controls.maxPolarAngle = Math.PI * .49;
      const pmrem = new PMREMGenerator(renderer);
      const environment = roomEnvironment('neutral');
      try { environmentTarget = pmrem.fromScene(environment, .04); }
      finally { environment.dispose(); pmrem.dispose(); }
      scene.environment = environmentTarget.texture;
      scene.environmentIntensity = .55;
      scene.add(new HemisphereLight('#fff', '#e5e7e2', .22));
      keyLight = new DirectionalLight('#fff', 1.5);
      scene.add(keyLight);
      const fill = new DirectionalLight('#fff', .25);
      fill.position.set(-3, 2, -3);
      scene.add(fill);
      const resize = () => {
        if (disposed) return;
        const rect = host.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        renderer.setSize(rect.width, rect.height, false);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        if (object) fit();
      };
      resizeObserver = new view.ResizeObserver(resize);
      resizeObserver.observe(host);
      resize();
      controls.addEventListener('change', render);
      controls.addEventListener('start', controlStart);
      controls.addEventListener('end', controlEnd);
      listen(canvas, 'webglcontextlost', event => {
        event.preventDefault();
        loadAbort?.abort();
        ++loadVersion;
        ready = false;
        controls.enabled = false;
        host.dataset.state = 'error';
        syncRotation();
        setStatus(copyText("ui.2eba479f9b2c99111076","3D vaizdas nutrūko. Atkurkite vaizdą arba atidarykite konfigūratorių."), true);
      });
      listen(canvas, 'webglcontextrestored', () => { if (!disposed) loadAssembly(); });
      loadAssembly();
    } catch {
      ready = false;
      host.dataset.state = 'error';
      setStatus(copyText("ui.1d9a2652b40deb6e08a8","Šioje naršyklėje 3D peržiūra nepasiekiama. Atidarykite visą konfigūratorių."), true);
      syncRotation();
    }
  }

  function change(field, value) {
    if (disposed) return;
    try {
      const previous = state;
      state = changeDemoState(state, field, value);
      syncControls();
      if (renderer) {
        if (field === 'color') {
          if (host.dataset.textureError === 'true') { textureErrors.clear(); delete host.dataset.textureError; setStatus(''); }
          finishes();
        } else if (demoAssemblyKey(previous) !== demoAssemblyKey(state)) loadAssembly();
      }
    } catch { setStatus(copyText("ui.0d2a75d7e6cf84385f18","Nepavyko pakeisti demonstracijos pasirinkimo. Bandykite dar kartą."), true); }
  }

  listen(colors, 'click', event => {
    const button = event.target.closest?.('button[data-code]');
    if (button && colors.contains(button)) change('color', button.dataset.code);
  });
  for (const button of section.querySelectorAll('button[data-armrests]')) listen(button, 'click', () => change('armrests', button.dataset.armrests));
  for (const button of section.querySelectorAll('button[data-headrest]')) listen(button, 'click', () => change('headrest', button.dataset.headrest === 'with'));
  listen(rotate, 'click', () => { rotating = !rotating; syncRotation(); });
  listen(host, 'mouseenter', () => { hover = true; syncRotation(); });
  listen(host, 'mouseleave', () => { hover = false; syncRotation(); });
  listen(canvas, 'focus', () => { focused = true; syncRotation(); });
  listen(canvas, 'blur', () => { focused = false; syncRotation(); });
  listen(reset, 'click', () => {
    if (host.dataset.state === 'error' && renderer) loadAssembly();
    else if (object) {
      if (textureErrors.size) { setStatus(copyText("ui.a411ba29bdea89d9e1bf","Pakartotinai įkeliamos apmušalo tekstūros…")); finishes(); }
      fit();
    }
  });
  listen(canvas, 'keydown', event => {
    if (!controls || !ready) return;
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', '+', '-', 'Home'].includes(key)) return;
    event.preventDefault();
    if (key === 'Home') fit();
    else {
      const offset = camera.position.clone().sub(controls.target);
      if (key.startsWith('Arrow')) offset.applyAxisAngle(new Vector3(0, 1, 0), key === 'ArrowLeft' ? .2 : -.2);
      else offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * (key === '+' ? .85 : 1.15))));
      camera.position.copy(controls.target).add(offset);
      controls.update();
      render();
    }
  });
  listen(document, 'visibilitychange', syncRotation);
  listen(reduced, 'change', () => { if (reduced.matches) rotating = false; syncRotation(); });

  function cleanup() {
    if (disposed) return;
    disposed = true;
    ready = false;
    ++loadVersion;
    loadAbort?.abort();
    listeners.abort();
    preloadObserver?.disconnect();
    visibilityObserver?.disconnect();
    resizeObserver?.disconnect();
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    if (controls) {
      controls.removeEventListener('change', render);
      controls.removeEventListener('start', controlStart);
      controls.removeEventListener('end', controlEnd);
      controls.dispose();
    }
    removeAssembly();
    for (const pending of pendingAssemblies) disposeObject(pending);
    pendingAssemblies.clear();
    for (const part of pendingParts) disposeObject(part);
    pendingParts.clear();
    for (const map of cachedTextures) disposeTexture(map);
    cachedTextures.clear();
    textures.clear();
    textureErrors.clear();
    keyLight?.shadow.dispose();
    environmentTarget?.dispose();
    scene?.clear();
    renderer?.renderLists.dispose();
    renderer?.dispose();
    if (mountedRoots.get(rootElement) === cleanup) mountedRoots.delete(rootElement);
  }

  mountedRoots.set(rootElement, cleanup);
  syncControls();
  syncRotation();
  // Fetch near the viewport; rotation only runs while the actual stage is visible.
  if (view.IntersectionObserver) {
    preloadObserver = new view.IntersectionObserver(entries => {
      if (!disposed && entries.some(entry => entry.isIntersecting)) { start(); preloadObserver.disconnect(); }
    }, {rootMargin: '160px'});
    visibilityObserver = new view.IntersectionObserver(entries => {
      if (disposed) return;
      const entry = entries[0];
      inView = entry.isIntersecting && entry.intersectionRatio > 0;
      host.dataset.inView = String(inView);
      syncRotation();
    });
    preloadObserver.observe(host);
    visibilityObserver.observe(host);
  } else {
    inView = true;
    host.dataset.inView = 'true';
    start();
  }
  return cleanup;
}
