/* Asset proof only: selection without commerce or simulator side effects. */
(() => {
  const cards = [...document.querySelectorAll('.cv-offer[role="radio"]')];
  const select = (card, focus = false) => {
    cards.forEach(other => {
      other.setAttribute('aria-checked', String(other === card));
      other.tabIndex = other === card ? 0 : -1;
    });
    if (focus) card.focus();
  };
  cards.forEach((card, index) => {
    card.addEventListener('click', () => select(card));
    card.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % cards.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + cards.length) % cards.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = cards.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      select(cards[next], true);
    });
  });
})();
