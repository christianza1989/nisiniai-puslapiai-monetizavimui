
// editorial-copy-wired
import {copyText} from '../../src/lib/editorial-copy.ts';
export function mountCategories(root) {
let destroyed=false;const lifecycle=new AbortController(),observers=[];
function listen(target,type,callback,options={}) { target.addEventListener(type,callback,{...options,signal:lifecycle.signal}); }
function watchIntersection(callback,options) { const observer=new IntersectionObserver(callback,options);observers.push(observer);return observer; }
function watchResize(callback) { const observer=new ResizeObserver(callback);observers.push(observer);return observer; }
const section = root.querySelector('.hp-category-section');
  if (!section) return;
  const viewport = section.querySelector('.hp-category-viewport');
  const track = section.querySelector('.hp-category-track');
  const slides = [...track.children];
  const controls = section.querySelector('.hp-category-controls');
  const range = section.querySelector('[data-category-range]');
  const announce = section.querySelector('[data-carousel-announcement]');
  const play = section.querySelector('.hp-carousel-play');
  const playLabel = section.querySelector('[data-play-label]');
  const playIcon = section.querySelector('[data-play-icon]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // Five visual duplicates cover the seam without repeating keyboard or
  // accessibility entries. Copied links retain their real mouse destinations.
  const seamSlides = slides.slice(0, 5).map(slide => {
    const copy = slide.cloneNode(true);
    copy.removeAttribute('data-category-id');
    copy.setAttribute('data-carousel-clone', '');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelector('a').tabIndex = -1;
    track.append(copy);
    return copy;
  });

  // The owner selected a steady standard pace for autoplay. Reduced Motion
  // keeps instant manual navigation; a persistent Pause control is present.
  const speed = () => 40;
  let userPaused = false;
  let hovering = section.matches(':hover');
  let focusing = false;
  let visible = false;
  let assetsReady = false;
  let interacting = false;
  let pointerActive = false;
  let frame = 0;
  let updateFrame = 0;
  let resumeTimer;
  let previousTime;
  let position = 0;
  let stepSize = 1;
  let loopWidth = 1;
  let originalEnd = 0;
  let shown = 5;

  controls.hidden = false;
  function firstIndex() {
    return Math.round((viewport.scrollLeft % loopWidth) / stepSize) % slides.length;
  }
  function update() {
    const first = firstIndex();
    const end = first + shown;
    const text = end > slides.length
      ? `${first + 1 === slides.length ? slides.length : `${first + 1}–${slides.length}`} · 1–${end - slides.length}`
      : end === first + 1 ? String(first + 1) : `${first + 1}–${end}`;
    if (range.textContent !== text) range.textContent = text;
  }
  function setPlayState() {
    play.setAttribute('aria-pressed', String(userPaused));
    play.setAttribute('aria-label', userPaused ? copyText("ui.ae9bffa59893ed0d5f75","Paleisti automatinį kategorijų slinkimą") : copyText("ui.166a98fa1e315808d3cc","Sustabdyti automatinį kategorijų slinkimą"));
    playLabel.textContent = userPaused ? 'Paleisti' : 'Sustabdyti';
    playIcon.innerHTML = userPaused ? '<path d="m9 5 10 7-10 7Z"></path>' : '<path d="M9 6v12M15 6v12"></path>';
  }
  function canRun() { return !destroyed && assetsReady && !userPaused && !hovering && !focusing && !interacting && !pointerActive && visible && !document.hidden;
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = undefined;
  }
  function tick(time) {
    if (!canRun()) { stop(); return; }
    if (previousTime !== undefined) {
      // Retain fractional progress: rereading rounded scrollLeft every frame
      // would stall slow movement. Bound elapsed time after a suspended frame.
      position = (position + Math.min(time - previousTime, 64) * speed() / 1000) % loopWidth;
      viewport.scrollLeft = position;
    }
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }
  function sync() { if (destroyed) return;
    stop();
    if (!canRun()) return;
    position = viewport.scrollLeft % loopWidth;
    frame = requestAnimationFrame(tick);
  }
  function holdForInteraction() {
    interacting = true;
    stop();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => { interacting = false; sync(); }, 1500);
  }
  function move(index, last = false) {
    holdForInteraction();
    const normalized = (index % slides.length + slides.length) % slides.length;
    viewport.scrollTo({left:last ? originalEnd : normalized * stepSize, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
    announce.textContent = copyText("ui.3693f6b9b6c73f16b8b2","Rodomos kategorijos nuo {{p0}}.",{p0:(slides[normalized].querySelector('h3').textContent.trim())});
  }
  function measure() {
    const relative = viewport.scrollLeft / stepSize;
    stepSize = slides[1].offsetLeft - slides[0].offsetLeft;
    loopWidth = seamSlides[0].offsetLeft - slides[0].offsetLeft;
    originalEnd = Math.max(0, loopWidth - (stepSize - slides[0].offsetWidth) - viewport.clientWidth);
    shown = Math.max(1, Math.floor((viewport.clientWidth + stepSize - slides[0].offsetWidth + 2) / stepSize));
    viewport.scrollLeft = Math.min(relative * stepSize, loopWidth);
    controls.querySelectorAll('[data-direction]').forEach(button => { button.disabled = slides.length <= shown; });
    update();
    sync();
  }

  listen(controls, 'click', event => {
    const button = event.target.closest('[data-direction]');
    if (button) move(firstIndex() + Number(button.dataset.direction) * shown);
  });
  listen(play, 'click', () => {
    userPaused = !userPaused;
    if (!userPaused) focusing = false;
    setPlayState();
    sync();
  });
  listen(viewport, 'keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'End') move(Math.round(originalEnd / stepSize), true);
    else move(event.key === 'Home' ? 0 : firstIndex() + (event.key === 'ArrowRight' ? 1 : -1));
  });
  listen(viewport, 'pointerdown', () => { pointerActive = true; holdForInteraction(); });
  ['pointerup', 'pointercancel'].forEach(type => listen(window, type, () => {
    if (!pointerActive) return;
    pointerActive = false;
    if (!document.activeElement.matches(':focus-visible')) focusing = false;
    holdForInteraction();
  }));
  listen(viewport, 'wheel', holdForInteraction, {passive:true});
  listen(viewport, 'scroll', () => {
    cancelAnimationFrame(updateFrame);
    updateFrame = requestAnimationFrame(update);
    if (!frame && interacting) holdForInteraction();
  }, {passive:true});
  listen(viewport, 'focusin', event => {
    const card = event.target.closest('.hp-category-slide');
    const index = slides.indexOf(card);
    if (index < 0) return;
    const left = card.offsetLeft - slides[0].offsetLeft;
    if (left < viewport.scrollLeft || left + card.offsetWidth > viewport.scrollLeft + viewport.clientWidth + 2) move(index);
  });
  listen(section, 'mouseenter', () => { hovering = true; sync(); });
  listen(section, 'mouseleave', () => {
    hovering = false;
    if (!document.activeElement.matches(':focus-visible')) focusing = false;
    sync();
  });
  listen(section, 'focusin', event => {
    focusing = event.target !== play;
    sync();
  });
  listen(section, 'focusout', event => {
    if (section.contains(event.relatedTarget)) return;
    focusing = false;
    sync();
  });
  listen(document, 'visibilitychange', sync);
  listen(reducedMotion, 'change', sync);
  watchIntersection(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= 0.3;
    sync();
  }, {threshold:0.3}).observe(section);
  watchResize(measure).observe(viewport);
  setPlayState();
  measure();
  // Decode the small local catalog set before motion begins. Otherwise lazy,
  // asynchronous image painting can leave entering cards blank while scrolling.
  const images = [...track.querySelectorAll('img')];
  images.forEach(image => { image.loading = 'eager'; image.decoding = 'sync'; });
  Promise.allSettled(images.map(image => image.decode())).then(() => {
    assetsReady = true;
    sync();
  });

return () => {destroyed=true;stop();clearTimeout(resumeTimer);cancelAnimationFrame(updateFrame);lifecycle.abort();observers.forEach(o=>o.disconnect());seamSlides.forEach(node=>node.remove());};
}

export function mountGuides(root) {
let destroyed=false;const lifecycle=new AbortController(),observers=[];
function listen(target,type,callback,options={}) { target.addEventListener(type,callback,{...options,signal:lifecycle.signal}); }
function watchIntersection(callback,options) { const observer=new IntersectionObserver(callback,options);observers.push(observer);return observer; }
function watchResize(callback) { const observer=new ResizeObserver(callback);observers.push(observer);return observer; }
const section = root.querySelector('.hp-guide-section');
  if (!section) return;
  const viewport = section.querySelector('.hp-guide-viewport');
  const track = section.querySelector('.hp-guide-track');
  const slides = [...track.children];
  const play = section.querySelector('.hp-guide-play');
  if (slides.length < 2) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const seam = slides.map(slide => {
    const copy = slide.cloneNode(true);
    copy.removeAttribute('data-guide-id');
    copy.setAttribute('data-guide-clone', '');
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    copy.querySelectorAll('a, button, [tabindex]').forEach(node => node.tabIndex = -1);
    track.append(copy);
    return copy;
  });
  const speed = 40; // Same standard pace selected for the category carousel.
  let paused = false;
  let hovering = section.matches(':hover');
  let focusing = false;
  let visible = false;
  let ready = false;
  let interacting = false;
  let pointerActive = false;
  let frame = 0;
  let timer;
  let previousTime;
  let position = 0;
  let step = 1;
  let loop = 1;
  play.hidden = false;
  function setPlayState() {
    play.setAttribute('aria-pressed', String(paused));
    play.setAttribute('aria-label', paused ? copyText("ui.159a8851c5bd75dfe106","Paleisti automatinį straipsnių slinkimą") : copyText("ui.95585119a1be9bf3160f","Sustabdyti automatinį straipsnių slinkimą"));
    play.querySelector('svg').innerHTML = paused ? '<path d="m9 5 10 7-10 7Z"></path>' : '<path d="M9 6v12M15 6v12"></path>';
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = undefined;
  }
  function canRun() { return !destroyed && ready && visible && !paused && !hovering && !focusing && !interacting && !pointerActive && !document.hidden;
  }
  function tick(time) {
    if (!canRun()) { stop(); return; }
    if (previousTime !== undefined) {
      position = (position + Math.min(time - previousTime, 64) * speed / 1000) % loop;
      viewport.scrollLeft = position;
    }
    previousTime = time;
    frame = requestAnimationFrame(tick);
  }
  function sync() { if (destroyed) return;
    stop();
    if (!canRun()) return;
    position = viewport.scrollLeft % loop;
    frame = requestAnimationFrame(tick);
  }
  function hold() {
    interacting = true;
    stop();
    clearTimeout(timer);
    timer = setTimeout(() => { interacting = false; sync(); }, 1500);
  }
  function measure() {
    const relative = viewport.scrollLeft / step;
    step = slides[1].offsetLeft - slides[0].offsetLeft;
    loop = seam[0].offsetLeft - slides[0].offsetLeft;
    viewport.scrollLeft = (relative * step) % loop;
    sync();
  }
  listen(play, 'click', () => {
    paused = !paused;
    focusing = false;
    setPlayState();
    sync();
  });
  listen(section, 'mouseenter', () => { hovering = true; sync(); });
  listen(section, 'mouseleave', () => { hovering = false; sync(); });
  listen(section, 'focusin', event => { focusing = event.target !== play; sync(); });
  listen(section, 'focusout', event => {
    if (section.contains(event.relatedTarget)) return;
    focusing = false;
    sync();
  });
  listen(viewport, 'keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    hold();
    const first = Math.round((viewport.scrollLeft % loop) / step);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : (first + (event.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length;
    viewport.scrollTo({left: index * step, behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
  listen(viewport, 'wheel', hold, {passive: true});
  listen(viewport, 'pointerdown', () => { pointerActive = true; hold(); });
  ['pointerup', 'pointercancel'].forEach(type => listen(window, type, () => {
    if (!pointerActive) return;
    pointerActive = false;
    hold();
  }));
  listen(document, 'visibilitychange', sync);
  listen(reducedMotion, 'change', sync);
  watchIntersection(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, {threshold: 0}).observe(section);
  watchResize(measure).observe(viewport);
  setPlayState();
  measure();
  // Decode once on approach, so cards entering the loop never paint blank.
  const loader = watchIntersection(entries => {
    if (!entries[0].isIntersecting) return;
    loader.disconnect();
    const images = [...track.querySelectorAll('img')];
    images.forEach(image => { image.loading = 'eager'; });
    Promise.allSettled(images.map(image => image.decode())).then(() => { ready = true; sync(); });
  }, {rootMargin: '500px'});
  loader.observe(section);

return () => {destroyed=true;stop();clearTimeout(timer);lifecycle.abort();observers.forEach(o=>o.disconnect());seam.forEach(node=>node.remove());};
}
