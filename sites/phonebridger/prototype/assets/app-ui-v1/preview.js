/* Standalone asset-kit review. Local dummy state; no files or native settings. */
(() => {
  const root = document.querySelector('main');
  root.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    root.querySelectorAll('[data-view]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    root.querySelectorAll('[data-panel]').forEach(panel => panel.hidden = panel.dataset.panel !== button.dataset.view);
  }));
  const ranges = root.querySelectorAll('[data-output]');
  function updateRange(input) {
    const value = Number(input.value);
    document.getElementById(input.dataset.output).textContent = `${value}%`;
    input.style.setProperty('--pb-progress', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
    if (input.id === 'speed') root.querySelectorAll('[data-speed]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.speed) === value)));
  }
  ranges.forEach(input => input.addEventListener('input', () => updateRange(input)));
  root.querySelectorAll('[data-speed]').forEach(button => button.addEventListener('click', () => { const input = document.getElementById('speed'); input.value = button.dataset.speed; updateRange(input); }));
  const feedback = document.getElementById('demo-feedback');
  root.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => feedback.textContent = button.dataset.demo));
  const progress = document.getElementById('transfer-progress');
  const download = document.getElementById('demo-download'), pause = document.getElementById('demo-pause'), cancel = document.getElementById('demo-cancel');
  let transfer = 68, timer = null, paused = false, transferring = false;
  function paintTransfer() { progress.style.setProperty('--pb-progress', `${transfer}%`); progress.setAttribute('aria-valuenow', String(transfer)); }
  function stopTimer() { clearInterval(timer); timer = null; }
  function tick() {
    transfer = Math.min(100, transfer + 4); paintTransfer();
    if (transfer === 100) { stopTimer(); transferring = false; download.disabled = false; pause.disabled = cancel.disabled = true; feedback.textContent = 'Demo download complete. No real file was transferred.'; }
  }
  download.addEventListener('click', () => {
    stopTimer(); transfer = 0; paused = false; transferring = true; paintTransfer();
    download.disabled = true; pause.disabled = cancel.disabled = false; pause.textContent = 'Pause';
    feedback.textContent = `Demo: weekly-recap.pdf · ${document.getElementById('phone').value} → PC`;
    timer = setInterval(tick, 180);
  });
  pause.addEventListener('click', () => { if (!transferring) return; paused = !paused; pause.textContent = paused ? 'Resume' : 'Pause'; if (paused) stopTimer(); else timer = setInterval(tick, 180); });
  cancel.addEventListener('click', () => { stopTimer(); transfer = 0; transferring = false; paused = false; paintTransfer(); download.disabled = false; pause.disabled = cancel.disabled = true; pause.textContent = 'Pause'; feedback.textContent = 'Demo transfer cancelled.'; });
  document.getElementById('phone').addEventListener('change', () => { if (transferring) cancel.click(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && transferring && !paused) pause.click(); });
  const names = ['phone','monitor','mouse','keyboard','waveform','browser','folder','folder-open','file','file-text','image','archive','upload','download','transfer','settings','wifi','usb','cursor','zone','speaker','mute','headphones','check-circle','lock','reset','pause','stop','plus','external','app-sheets','app-gmail','app-drive','app-calendar','app-keep'];
  const ns = 'http://www.w3.org/2000/svg';
  for (const name of names) {
    const item = document.createElement('div'); item.className = 'icon-sample';
    const svg = document.createElementNS(ns, 'svg'); svg.classList.add('pb-icon'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use'); use.setAttribute('href', `icons.svg#pb-${name}`); svg.append(use);
    const label = document.createElement('span'); label.textContent = name; item.append(svg, label); document.getElementById('icons-grid').append(item);
  }
})();
