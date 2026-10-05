/* Homepage invitations into the existing website-only simulator. */
(() => {
  'use strict';
  const section = document.querySelector('#try-workspace');
  if (!section) return;
  section.addEventListener('click', event => {
    const button = event.target.closest('[data-demo-action]');
    if (!button) return;
    const sim = window.PhoneBridgerSimulator;
    const desktop = window.PhoneBridgerDesktop;
    const demo = window.PhoneBridgerDemo;
    if (!sim || !desktop || !demo) return;
    let hint;
    switch (button.dataset.demoAction) {
      case '01-move-screens':
        desktop.showcase('devices', 'left');
        sim.home('left'); sim.home('right');
        hint = 'Move through a PC screen edge to enter a phone. Press Esc to leave.';
        break;
      case '02-type-reply':
        desktop.open('chrome'); sim.open('pc', 'gmail');
        sim.open('left', 'whatsapp', {thread:'alex'});
        hint = 'Move to the left phone, click Message and write a reply to Alex.';
        break;
      case '03-send-tab':
        desktop.open('chrome'); sim.open('pc', 'sheets');
        sim.home('right');
        hint = 'Drag the Sheets tab to a side phone, or choose Send tab.';
        break;
      case '04-file-transfer':
        desktop.hide('chrome'); desktop.hide('phonebridger');
        sim.open('pc', 'files', {explorer:true, folder:'Pictures', page:'list'});
        sim.home('right');
        hint = 'Drag a photo from File Explorer onto a side phone, then choose its folder and Save.';
        break;
      case '05-pc-audio':
        desktop.showcase('audio', 'left');
        hint = 'Try Audio to PC and adjust Volume. These app settings are simulated; the video has its own sound controls.';
        break;
      case '06-phonebridger':
        desktop.showcase('devices', 'right');
        sim.open('right', 'phonebridger', {pbPage:'home'});
        hint = 'Explore Devices, Mouse & keyboard, Audio, Browser and Files in PhoneBridger.';
        break;
      default: return;
    }
    section.querySelector('[data-experience-status]').textContent = hint;
    document.querySelector('[data-hint]').textContent = hint;
    if (window.matchMedia('(max-width:700px)').matches) {
      const phone = button.dataset.demoAction === '02-type-reply' ? 'left' : 'right';
      if (button.dataset.demoAction === '03-send-tab') sim.open('right','sheets');
      if (button.dataset.demoAction === '04-file-transfer') sim.sampleTransfer('right');
      if (button.dataset.demoAction === '05-pc-audio') sim.open('right','phonebridger',{pbPage:'audio'});
      document.querySelector(`[data-mobile="${phone}"]`)?.click();
      document.querySelector('#mobile-demo')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
    } else {
      // Keep capture in the original click gesture, using the established engine.
      demo.resumeMouseControl();
      if (!demo.isDriving()) document.querySelector('.device-laptop')?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'center'});
    }
  });
})();
