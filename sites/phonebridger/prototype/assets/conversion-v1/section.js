/* Website-only bundle handoff. No commerce, persistence or simulator state. */
(() => {
  const section = document.getElementById('choose-setup');
  const dialog = document.getElementById('setup-preview');
  if (!section || !dialog) return;
  const trigger = section.querySelector('[data-choose-setup]');
  trigger.addEventListener('click', () => {
    const selected = section.querySelector('.cv-offer[aria-checked="true"]');
    if (!selected) return;
    dialog.querySelector('[data-setup-title]').textContent = selected.querySelector('.cv-offer-title').textContent;
    const count = Number(selected.dataset.holders || 0);
    dialog.querySelector('[data-setup-summary]').textContent = count
      ? `PhoneBridger Windows app + ${count} magnetic ${count === 1 ? 'holder' : 'holders'}. Holders will be available in Black or Silver.`
      : 'PhoneBridger Windows app. Use the phones and setup you already have.';
    dialog.dataset.setup = selected.dataset.setup;
    dialog.showModal();
  });
  dialog.querySelectorAll('[data-close-setup]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));
  dialog.querySelector('[data-setup-beta]').addEventListener('click', () => dialog.close());
})();
