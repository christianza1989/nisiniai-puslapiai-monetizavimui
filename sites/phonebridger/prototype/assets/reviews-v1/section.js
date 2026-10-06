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
  if (!total) return;
  let index = 0, timer, userPaused = false, hovered = false, focused = false;
  let inView = false, drag = null, dragFraction = 0;
  const mod = value => (value % total + total) % total;
  const distance = slot => mod(slot - index + total / 2) - total / 2;
  const step = () => Math.min(225, stage.clientWidth < 600 ? stage.clientWidth * .87 : stage.clientWidth * .17);
  function render() {
    const small = stage.clientWidth < 600;
    cards.forEach((card, slot) => {
      const d = distance(slot) - dragFraction, depth = Math.abs(d);
      card.style.setProperty('--rv-x', `${d * step()}px`);
      card.style.setProperty('--rv-y', `${Math.min(depth, 4) * 11}px`);
      card.style.setProperty('--rv-yaw', `${Math.max(-18, Math.min(18, -d * 7))}deg`);
      card.style.setProperty('--rv-scale', Math.max(.64, 1 - depth * .105));
      card.style.setProperty('--rv-opacity', depth <= (small ? 1.4 : 3.4) ? 1 : 0);
      card.style.setProperty('--rv-brightness', Math.max(.42, 1 - depth * .16));
      card.style.setProperty('--rv-z', Math.round(100 - depth * 10));
      card.style.setProperty('--rv-visible', depth <= (small ? 1.4 : 3.4) ? 'visible' : 'hidden');
      card.dataset.active = String(slot === index);
      card.setAttribute('aria-hidden', String(slot !== index));
    });
    current.textContent = String(index + 1).padStart(2, '0');
    stage.setAttribute('aria-label', `Review ${index + 1} of ${total}. Use Left and Right arrow keys to explore.`);
  }
  function schedule() {
    clearTimeout(timer);
    if (userPaused || motion.matches || hovered || focused || !inView || document.hidden || drag) return;
    // Give longer sample paragraphs enough reading time before moving to the next settled card.
    const words = cards[index].querySelector('blockquote').textContent.trim().split(/\s+/).length;
    timer = setTimeout(() => select(index + 1, false), Math.max(8500, words * 300 + 2500));
  }
  function select(next, announce = true) {
    index = mod(next); dragFraction = 0; render(); schedule();
    if (announce) live.textContent = `Review ${index + 1} of ${total}. ${cards[index].querySelector('.rv-name').textContent}.`;
  }
  function updatePause() {
    pause.dataset.paused = String(userPaused || motion.matches);
    pause.setAttribute('aria-pressed', String(userPaused || motion.matches));
    pause.disabled = motion.matches;
    pause.setAttribute('aria-label', motion.matches ? 'Automatic rotation paused for reduced motion' : userPaused ? 'Resume automatic rotation' : 'Pause automatic rotation');
    schedule();
  }
  root.querySelector('.rv-prev').addEventListener('click', () => select(index - 1));
  root.querySelector('.rv-next').addEventListener('click', () => select(index + 1));
  pause.addEventListener('click', () => { userPaused = !userPaused; updatePause(); });
  root.addEventListener('keydown', event => {
    if (event.target.closest('a') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(index - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); select(index + 1); }
    if (event.key === 'Home') { event.preventDefault(); select(0); }
    if (event.key === 'End') { event.preventDefault(); select(total - 1); }
  });
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const slot = cards.indexOf(event.target.closest('.rv-card'));
    drag = { id:event.pointerId, x:event.clientX, y:event.clientY, dx:0, moved:false, slot };
    clearTimeout(timer);
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && (Math.abs(dx) < 12 || Math.abs(dx) <= Math.abs(dy))) return;
    drag.moved = true; drag.dx = dx;
    root.classList.add('rv-dragging');
    dragFraction = Math.max(-1.15, Math.min(1.15, dx / step()));
    render();
  });
  function endDrag(event, cancelled = false) {
    if (!drag || event.pointerId !== drag.id) return;
    const finished = drag; drag = null; dragFraction = 0;
    root.classList.remove('rv-dragging');
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (!cancelled && finished.moved && Math.abs(finished.dx) > 45) select(index + (finished.dx < 0 ? 1 : -1));
    else if (!cancelled && !finished.moved && finished.slot >= 0 && finished.slot !== index) select(finished.slot);
    else { render(); schedule(); }
  }
  stage.addEventListener('pointerup', event => endDrag(event));
  stage.addEventListener('pointercancel', event => endDrag(event, true));
  stage.addEventListener('lostpointercapture', event => endDrag(event, true));
  root.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  root.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') { hovered = false; schedule(); } });
  root.addEventListener('focusin', () => { focused = true; schedule(); });
  root.addEventListener('focusout', event => { focused = root.contains(event.relatedTarget); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', updatePause);
  new ResizeObserver(render).observe(stage);
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; schedule(); }, { threshold:.2 }).observe(stage);
  root.classList.add('rv-ready');
  render(); updatePause();
})();
