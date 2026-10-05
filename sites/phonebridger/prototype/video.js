/* Local HTML5 video, with controls shared by normal, touch and simulated input. */
(() => {
  const app = document.querySelector('[data-phone-app=video]');
  const surface = app.querySelector('.demo-video-player');
  const media = app.querySelector('video');
  const seek = app.querySelector('[data-video-seek]');
  const volume = app.querySelector('[data-video-volume]');
  const volumePanel = app.querySelector('[data-video-volume-panel]');
  const volumeValue = app.querySelector('[data-video-volume-value]');
  const playlist = window.PhoneBridgerVideoPlaylist || [];
  const controls = Object.fromEntries([...app.querySelectorAll('[data-video-control]')].map(button => [button.dataset.videoControl, button]));
  const title = app.querySelector('[data-video-title]'), author = app.querySelector('[data-video-author]');
  const elapsed = app.querySelector('[data-video-time]'), total = app.querySelector('[data-video-duration]');
  const count = app.querySelector('[data-video-count]'), status = app.querySelector('[data-video-status]');
  let index = 0, drag = null, hideTimer, wantsPlay = false, playRequest = 0, failed = false;
  let lastVolume = 0.7;
  const duration = () => Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0;
  const clock = seconds => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return value >= 3600 ? `${Math.floor(value/3600)}:${String(Math.floor(value/60)%60).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`
      : `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;
  };
  function showControls() {
    surface.dataset.controlsVisible = 'true'; clearTimeout(hideTimer);
    if (!media.paused && !drag && volumePanel.hidden) hideTimer = setTimeout(() => {
      if (!media.paused && !drag && volumePanel.hidden && !app.contains(document.activeElement)) surface.dataset.controlsVisible = 'false';
    }, 2600);
  }
  function sync() {
    const length = duration(), current = Math.max(0, Number(media.currentTime) || 0);
    const playing = !media.paused && !media.ended;
    elapsed.textContent = clock(current); total.textContent = clock(length);
    seek.max = String(length); seek.value = String(Math.min(current, length));
    seek.disabled = !length || failed;
    seek.setAttribute('aria-valuetext', `${clock(current)} of ${clock(length)}`);
    let buffered = 0;
    if (length && media.buffered?.length) buffered = media.buffered.end(media.buffered.length - 1) / length;
    seek.style.setProperty('--played', `${length ? current / length * 100 : 0}%`);
    seek.style.setProperty('--buffered', `${Math.min(1, buffered) * 100}%`);
    controls.play.disabled = !length || failed;
    controls.play.setAttribute('aria-label', playing ? 'Pause video' : 'Play video');
    // SVG elements need the actual attribute; .hidden does not reflect it.
    app.querySelector('[data-play-icon]').toggleAttribute('hidden', playing);
    app.querySelector('[data-pause-icon]').toggleAttribute('hidden', !playing);
    controls.previous.disabled = index === 0 || !playlist.length;
    controls.next.disabled = index >= playlist.length - 1;
    const silent = media.muted || media.volume === 0;
    if (media.volume > 0) lastVolume = media.volume;
    const level = silent ? 0 : Math.round(media.volume * 100);
    volume.value = String(level); volumeValue.textContent = `${level}%`;
    volume.setAttribute('aria-valuetext', `${level}%`);
    volume.style.setProperty('--volume', `${level}%`);
    const muteLabel = silent ? 'Unmute video' : 'Mute video';
    controls.mute.setAttribute('aria-label', muteLabel);
    controls.mute.setAttribute('title', muteLabel);
    controls.mute.setAttribute('aria-pressed', String(silent));
    app.querySelector('.sound-waves').toggleAttribute('hidden', silent);
    app.querySelector('.sound-off').toggleAttribute('hidden', !silent);
    if (!failed) {
      app.dataset.videoState = !length ? 'loading' : media.ended ? 'ended' : playing ? 'playing' : 'paused';
      status.hidden = Boolean(length);
    }
    if (!playing) { surface.dataset.controlsVisible = 'true'; clearTimeout(hideTimer); }
  }
  async function play() {
    if (failed) return;
    if (!duration()) { wantsPlay = true; return; }
    wantsPlay = false;
    const request = ++playRequest;
    if (media.ended) media.currentTime = 0;
    try { await media.play(); }
    catch (_) {
      if (request !== playRequest) return;
      status.textContent = 'Press Play to start the video.'; status.hidden = false;
      showControls();
    }
  }
  function pause() {
    ++playRequest; wantsPlay = false; drag = null;
    media.pause(); sync();
  }
  function togglePlayback() {
    if (!duration() || failed) return;
    if (media.paused || media.ended) play(); else pause();
    showControls();
  }
  function loadClip(next, autoplay = false) {
    if (!playlist[next]) return;
    pause(); index = next; failed = false; wantsPlay = autoplay;
    const clip = playlist[index];
    media.poster = clip.poster || ''; media.src = clip.src;
    title.textContent = clip.title; author.textContent = clip.author || '@phonebridger';
    count.textContent = `${index + 1} / ${playlist.length}`;
    app.dataset.videoState = 'loading'; status.textContent = 'Loading video…'; status.hidden = false;
    media.load(); sync(); showControls();
  }
  function activate(action) {
    if (controls[action]?.disabled) return;
    if (action === 'play') togglePlayback();
    else if (action === 'previous') loadClip(index - 1, true);
    else if (action === 'next') loadClip(index + 1, true);
    else if (action === 'volume') setVolumeOpen(volumePanel.hidden);
    else if (action === 'mute') {
      if (media.muted || media.volume === 0) { media.muted = false; if (media.volume === 0) media.volume = lastVolume; }
      else media.muted = true;
      sync(); showControls();
    }
  }
  function setVolumeOpen(open) {
    volumePanel.hidden = !open;
    controls.volume.setAttribute('aria-expanded', String(open));
    showControls();
  }
  function setVolume(value) {
    const level = Number(value);
    if (!Number.isFinite(level)) return;
    media.volume = Math.max(0, Math.min(100, level)) / 100;
    media.muted = media.volume === 0;
    sync(); showControls();
  }
  function volumeAt(clientY) {
    const rect = volume.getBoundingClientRect();
    if (rect.height) setVolume((rect.bottom - clientY) / rect.height * 100);
  }
  function seekAt(clientX) {
    const rect = seek.getBoundingClientRect(), length = duration();
    if (!length || !rect.width) return;
    const seconds = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * length;
    media.currentTime = seconds; sync();
  }
  function beginSeek(clientX, type) {
    if (!duration() || failed) return;
    drag = { type, kind: 'seek', resume: !media.paused && !media.ended };
    ++playRequest; wantsPlay = false; media.pause(); seekAt(clientX); showControls();
  }
  function beginVolume(clientY, type) {
    drag = { type, kind: 'volume', resume: false };
    volume.focus({preventScroll:true}); volumeAt(clientY); showControls();
  }
  function endDrag(resume = true) {
    if (!drag) return;
    const restart = drag.resume; drag = null;
    if (resume && restart) play();
    sync(); showControls();
  }
  app.addEventListener('click', event => {
    if (document.pointerLockElement) return;
    const button = event.target.closest('[data-video-control]');
    if (button) activate(button.dataset.videoControl);
    else if (event.target === media || event.target === surface) { setVolumeOpen(false); togglePlayback(); }
  });
  seek.addEventListener('pointerdown', event => {
    if (document.pointerLockElement || event.button !== 0 || seek.disabled) return;
    beginSeek(event.clientX, 'native'); seek.setPointerCapture(event.pointerId);
  });
  seek.addEventListener('pointermove', event => { if (drag?.type === 'native' && drag.kind === 'seek') seekAt(event.clientX); });
  seek.addEventListener('pointerup', () => { if (drag?.type === 'native' && drag.kind === 'seek') endDrag(); });
  seek.addEventListener('pointercancel', () => { if (drag?.type === 'native' && drag.kind === 'seek') endDrag(false); });
  seek.addEventListener('input', () => {
    if (duration() && !failed) { media.currentTime = Math.max(0, Math.min(duration(), Number(seek.value))); sync(); showControls(); }
  });
  volume.addEventListener('pointerdown', event => {
    if (document.pointerLockElement || event.button !== 0) return;
    event.preventDefault(); beginVolume(event.clientY, 'native'); volume.setPointerCapture(event.pointerId);
  });
  volume.addEventListener('pointermove', event => { if (drag?.type === 'native' && drag.kind === 'volume') volumeAt(event.clientY); });
  volume.addEventListener('pointerup', () => { if (drag?.type === 'native' && drag.kind === 'volume') endDrag(); });
  volume.addEventListener('pointercancel', () => { if (drag?.type === 'native' && drag.kind === 'volume') endDrag(false); });
  volume.addEventListener('input', () => setVolume(volume.value));
  document.addEventListener('pointerdown', event => {
    if (!document.pointerLockElement && !event.target.closest('[data-video-volume-controls]')) setVolumeOpen(false);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setVolumeOpen(false); });
  app.addEventListener('pointermove', showControls);
  app.addEventListener('focusin', showControls);
  app.addEventListener('keydown', event => {
    const action = event.target.closest('[data-video-control]');
    if (document.pointerLockElement && action && ['Enter',' '].includes(event.key)) {
      event.preventDefault(); activate(action.dataset.videoControl);
    }
  });
  for (const event of ['timeupdate','durationchange','progress','pause','volumechange','seeked']) media.addEventListener(event, sync);
  media.addEventListener('play', () => { sync(); showControls(); });
  media.addEventListener('loadedmetadata', () => { sync(); if (wantsPlay) play(); });
  media.addEventListener('ended', () => { sync(); if (index < playlist.length - 1) loadClip(index + 1, true); });
  media.addEventListener('error', () => {
    failed = true; wantsPlay = false; drag = null; ++playRequest;
    app.dataset.videoState = 'error'; status.textContent = 'This video could not load. Try the next clip.';
    status.hidden = false; sync(); showControls();
  });
  window.PhoneBridgerVideo = {
    togglePlayback, pause,
    reset() { lastVolume = 0.7; media.muted = false; media.volume = 0.7; setVolumeOpen(false); loadClip(0); },
    virtualDown(target, point) {
      if (!target?.closest('[data-video-volume-controls]')) setVolumeOpen(false);
      if (!app.contains(target)) return false;
      showControls();
      if (target.closest('[data-video-seek]')) beginSeek(point.x, 'virtual');
      else if (target.closest('[data-video-volume]')) beginVolume(point.y, 'virtual');
      else { const button = target.closest('[data-video-control]'); if (button) activate(button.dataset.videoControl); else if (!volumePanel.contains(target)) togglePlayback(); }
      return true;
    },
    virtualMove(point) {
      if (drag?.type === 'virtual') { if (drag.kind === 'volume') volumeAt(point.y); else seekAt(point.x); return true; }
      const rect = app.getBoundingClientRect();
      if (!app.hidden && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) showControls();
      return false;
    },
    virtualUp() { if (drag?.type === 'virtual') endDrag(); },
  };
  media.volume = 0.7;
  if (playlist.length) loadClip(0);
  else { failed = true; status.textContent = 'Add a video to the demo playlist.'; sync(); }
})();
