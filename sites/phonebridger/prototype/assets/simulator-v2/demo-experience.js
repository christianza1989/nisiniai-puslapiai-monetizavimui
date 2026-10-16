/* Website presentation and wheel routing. Cursor movement belongs to simulation.js. */
(() => {
  function scrollScreen(target, screen, event, viewportHeight, styleOf) {
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? screen.clientHeight || viewportHeight : 1;
    let dx = event.deltaX * unit, dy = event.deltaY * unit;
    if (event.shiftKey && !dx) { dx = dy; dy = 0; }
    let handled = false;
    for (let node = target; node && screen.contains(node); node = node.parentElement) {
      const style = styleOf(node);
      for (const [delta, axis, overflow, size, content] of [
        [dx, 'scrollLeft', style.overflowX, 'clientWidth', 'scrollWidth'],
        [dy, 'scrollTop', style.overflowY, 'clientHeight', 'scrollHeight'],
      ]) {
        if (!delta || !/^(auto|scroll)$/.test(overflow)) continue;
        const before = node[axis], limit = Math.max(0, node[content] - node[size]);
        if (!limit) continue;
        handled = true;
        node[axis] = Math.max(0, Math.min(limit, before + delta));
        const consumed = node[axis] - before;
        if (axis === 'scrollLeft') dx -= consumed; else dy -= consumed;
      }
      if ((!dx && !dy) || node === screen) break;
    }
    // Fixed app tools/folder tiles share their app's content scroller. Never fall
    // through to a different scroller when the hovered one has reached its edge.
    if (!handled) {
      const app = target?.closest?.('.sim-modal,.sim-surface,.utility-app,.google-replica,[data-phone-app]');
      if (!app || !screen.contains(app)) return;
      const modal = app.querySelector('.sim-modal');
      const scope = modal || app;
      const choices = [scope, ...scope.querySelectorAll('.sim-scroll,.utility-app,.sim-sheet-grid')];
      const content = choices.find(node => {
        if (!node.getClientRects().length) return false;
        const style = styleOf(node);
        return (dy && /^(auto|scroll)$/.test(style.overflowY) && node.scrollHeight > node.clientHeight)
          || (dx && /^(auto|scroll)$/.test(style.overflowX) && node.scrollWidth > node.clientWidth);
      });
      if (content) scrollScreen(content, screen, event, viewportHeight, styleOf);
    }
  }
  function fitDisplays(width, height, displaySpan, sceneWidth = 1200) {
    return Math.min(width, Math.max(1, height - 32) * sceneWidth / displaySpan);
  }
  if (typeof document === 'undefined') { module.exports = {scrollScreen, fitDisplays}; return; }
  window.PhoneBridgerScroll = {scrollScreen: (target, screen, event) =>
    scrollScreen(target, screen, event, window.innerHeight, getComputedStyle)};

  const scene = document.querySelector('.demo-scene'), shell = scene?.parentElement;
  const header = document.querySelector('.site-header');
  if (!scene || !shell) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, scrollFrame = 0, headerWasInert = false;
  function stopAlignment() {
    cancelAnimationFrame(frame);
    cancelAnimationFrame(scrollFrame);
    frame = scrollFrame = 0;
  }
  function scrollToPosition(top) {
    if (reduced.matches) { window.scrollTo({top, behavior: 'instant'}); return; }
    const from = window.scrollY;
    let started;
    function step(now) {
      scrollFrame = 0;
      if (document.pointerLockElement !== scene) return;
      started ??= now;
      const progress = Math.min(1, (now - started) / 1100);
      const eased = progress * progress * (3 - 2 * progress);
      window.scrollTo({top: from + (top - from) * eased, behavior: 'instant'});
      if (progress < 1) scrollFrame = requestAnimationFrame(step);
    }
    scrollFrame = requestAnimationFrame(step);
  }
  function align() {
    frame = 0;
    if (document.pointerLockElement !== scene) return;
    const area = scene.getBoundingClientRect(), scale = area.width / scene.offsetWidth;
    const displays = [...scene.querySelectorAll('[data-screen]')].map(el => el.getBoundingClientRect());
    // Include the photographed display bezels, while allowing the keyboard below to extend offscreen.
    const top = Math.min(...displays.map(r => r.top)) - 16 * scale;
    const bottom = Math.max(...displays.map(r => r.bottom)) + 28 * scale;
    const parentStyle = getComputedStyle(shell.parentElement);
    const width = shell.parentElement.clientWidth - parseFloat(parentStyle.paddingLeft) - parseFloat(parentStyle.paddingRight);
    const fit = fitDisplays(width, window.innerHeight, (bottom - top) / scale, scene.offsetWidth);
    shell.style.setProperty('--demo-fit-width', `${fit}px`);
    // Let the existing scene ResizeObserver update its scale before measuring the scroll destination.
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (document.pointerLockElement !== scene) return;
      const nextScale = scene.getBoundingClientRect().width / scene.offsetWidth;
      const edge = Math.min(...[...scene.querySelectorAll('[data-screen]')].map(el => el.getBoundingClientRect().top));
      scrollToPosition(Math.max(0, window.scrollY + edge - 16 * nextScale - 16));
    });
  }
  function schedule() { stopAlignment(); frame = requestAnimationFrame(align); }
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === scene) {
      if (header) { headerWasInert = header.inert; header.inert = true; }
      schedule();
    } else {
      stopAlignment();
      shell.style.removeProperty('--demo-fit-width');
      if (header) header.inert = headerWasInert;
    }
  });
  window.addEventListener('resize', () => { if (document.pointerLockElement === scene) schedule(); });
})();
