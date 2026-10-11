(() => {
  'use strict';
  const root = document.querySelector('#reviews');
  if (!root) return;
  const stage = root.querySelector('.rv-stage');
  const cards = [...root.querySelectorAll('.rv-card')];
  const pause = root.querySelector('.rv-pause');
  const current = root.querySelector('.rv-current');
  const live = root.querySelector('.rv-live');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const total = cards.length;
  if (!stage || !pause || !total) return;
  const mod = value => (value % total + total) % total;
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));
  const step = () => Math.max(1, Math.min(225, stage.clientWidth < 600 ? stage.clientWidth * .87 : stage.clientWidth * .17));
  let position = 0, target = 0, index = 0;
  let timer, wheelTimer, frame = 0, lastFrame = 0, announceOnSettle = false;
  let userPaused = false, hovered = false, focused = false, inView = false;
  let drag = null, wheeling = false;

  function render() {
    const small = stage.clientWidth < 600;
    index = mod(Math.round(position));
    cards.forEach((card, slot) => {
      const d = mod(slot - position + total / 2) - total / 2, depth = Math.abs(d);
      card.style.setProperty('--rv-x', d * step() + 'px');
      card.style.setProperty('--rv-y', Math.min(depth, 4) * 11 + 'px');
      card.style.setProperty('--rv-yaw', clamp(-d * 7, 18) + 'deg');
      card.style.setProperty('--rv-scale', Math.max(.64, 1 - depth * .105));
      card.style.setProperty('--rv-opacity', depth <= (small ? 1.4 : 3.4) ? 1 : 0);
      card.style.setProperty('--rv-brightness', Math.max(.42, 1 - depth * .16));
      card.style.setProperty('--rv-z', Math.round(100 - depth * 10));
      card.style.setProperty('--rv-visible', depth <= (small ? 1.4 : 3.4) ? 'visible' : 'hidden');
      card.dataset.active = String(slot === index);
      card.setAttribute('aria-hidden', String(slot !== index));
    });
    current.textContent = String(index + 1).padStart(2, '0');
    stage.setAttribute('aria-label', 'Review ' + (index + 1) + ' of ' + total + '. Drag, scroll, or use Left and Right arrow keys to explore.');
  }
  function schedule() {
    clearTimeout(timer);
    if (total < 2 || userPaused || motion.matches || hovered || focused || !inView || document.hidden || drag || wheeling || frame) return;
    const words = cards[index].querySelector('blockquote').textContent.trim().split(/\s+/).length;
    timer = setTimeout(() => moveTo(Math.round(position) + 1, false), Math.min(10500, Math.max(6500, words * 220 + 1800)));
  }
  function settled() {
    // Normalize the coordinate without jumping visibly at the loop seam.
    position = target = mod(target);
    root.classList.remove('rv-moving');
    render();
    if (announceOnSettle) live.textContent = 'Review ' + (index + 1) + ' of ' + total + '. ' + cards[index].querySelector('.rv-name').textContent + '.';
    announceOnSettle = false;
    schedule();
  }
  function tick(now) {
    const dt = Math.min(64, lastFrame ? now - lastFrame : 16);
    lastFrame = now;
    position += (target - position) * (1 - Math.exp(-dt / 85));
    render();
    if (Math.abs(target - position) > .002) frame = requestAnimationFrame(tick);
    else {
      position = target; frame = 0; lastFrame = 0;
      if (wheeling) render(); else settled();
    }
  }
  function stopAnimation() {
    cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
  }
  function moveTo(next, announce = true) {
    clearTimeout(timer);
    target = next; announceOnSettle = announce;
    root.classList.add('rv-moving');
    if (motion.matches) { stopAnimation(); position = target; settled(); }
    else if (!frame) frame = requestAnimationFrame(tick);
  }
  function endWheel() {
    clearTimeout(wheelTimer);
    if (!wheeling) return;
    wheeling = false;
    moveTo(Math.round(target));
  }
  function select(next) {
    endWheel(); moveTo(next);
  }
  function updatePause() {
    const paused = userPaused || motion.matches;
    pause.dataset.paused = String(paused);
    pause.setAttribute('aria-pressed', String(paused));
    pause.disabled = motion.matches;
    pause.setAttribute('aria-label', motion.matches ? 'Automatic rotation paused for reduced motion' : userPaused ? 'Resume automatic rotation' : 'Pause automatic rotation');
    schedule();
  }
  root.querySelector('.rv-prev').addEventListener('click', () => select(Math.round(target) - 1));
  root.querySelector('.rv-next').addEventListener('click', () => select(Math.round(target) + 1));
  pause.addEventListener('click', () => {
    userPaused = !userPaused;
    if (!userPaused) focused = false; // An explicit Play action must actually resume.
    updatePause();
  });
  root.addEventListener('keydown', event => {
    if (event.target.closest('a, input, textarea, select') || event.altKey || event.ctrlKey || event.metaKey) return;
    focused = true; schedule();
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(Math.round(target) - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); select(Math.round(target) + 1); }
    if (event.key === 'Home') { event.preventDefault(); select(position - mod(position)); }
    if (event.key === 'End') { event.preventDefault(); select(position - mod(position) + total - 1); }
  });
  // Deltas describe distance, not a one-card command. Trackpads supply momentum;
  // accumulate their events without adding a second artificial fling.
  stage.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || drag || !event.cancelable || total < 2) return;
    const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1;
    const delta = clamp(raw * unit, step() * 6);
    if (!delta) return;
    event.preventDefault();
    focused = false; wheeling = true;
    moveTo(target + delta / step(), false);
    clearTimeout(wheelTimer); wheelTimer = setTimeout(endWheel, 160);
  }, { passive: false });
  root.addEventListener('pointerdown', () => { focused = false; schedule(); }, true);
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest('a, button')) return;
    endWheel(); stopAnimation(); target = position;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, start: position,
      lastX: event.clientX, lastTime: performance.now(), velocity: 0, axis: null,
      slot: cards.indexOf(event.target.closest('.rv-card')) };
    clearTimeout(timer); stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (drag.axis !== 'x') return; // Browser owns vertical scrolling and pinch zoom.
    const now = performance.now(), elapsed = now - drag.lastTime;
    if (elapsed > 0) {
      const sample = (event.clientX - drag.lastX) / elapsed;
      drag.velocity = elapsed > 100 ? sample : drag.velocity * .35 + sample * .65;
    }
    drag.lastX = event.clientX; drag.lastTime = now;
    root.classList.add('rv-dragging', 'rv-moving');
    position = target = drag.start - dx / step(); render();
  });
  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = drag; drag = null;
    root.classList.remove('rv-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (finished.axis === 'x') {
      const recent = performance.now() - finished.lastTime < 100;
      const velocity = !cancelled && recent && !motion.matches && Math.abs(finished.velocity) > .35 ? finished.velocity : 0;
      // Short decelerating coast, capped at six extra cards, then snap.
      moveTo(Math.round(position + clamp(-velocity * 180 / step(), 6)), !cancelled);
    } else if (!cancelled && !finished.axis && finished.slot >= 0 && finished.slot !== index) {
      const offset = mod(finished.slot - position + total / 2) - total / 2;
      select(Math.round(position + offset));
    } else moveTo(Math.round(position), false);
  }
  stage.addEventListener('pointerup', event => endDrag(event));
  stage.addEventListener('pointercancel', event => endDrag(event, true));
  stage.addEventListener('lostpointercapture', event => endDrag(event, true));
  // Hover pauses the reading stage, not the whole section or its CTA.
  stage.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  stage.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; schedule(); } });
  root.addEventListener('focusin', event => { focused = event.target.matches(':focus-visible'); schedule(); });
  root.addEventListener('focusout', event => { focused = root.contains(event.relatedTarget) && event.relatedTarget.matches(':focus-visible'); schedule(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { endWheel(); stopAnimation(); position = target = Math.round(position); settled(); }
    else schedule();
  });
  motion.addEventListener('change', () => {
    if (motion.matches) { endWheel(); stopAnimation(); position = target = Math.round(position); settled(); }
    updatePause();
  });
  new ResizeObserver(render).observe(stage);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (!inView) { endWheel(); stopAnimation(); position = target = Math.round(position); settled(); }
    else schedule();
  }, { threshold: .2 }).observe(stage);
  root.classList.add('rv-ready'); render(); updatePause();
})();
