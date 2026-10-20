import { mountCheckout } from './checkout-ui.mjs';
const root = document.querySelector('#commerce');
const language = new URL(location.href).searchParams.get('language') || 'lt';
document.documentElement.lang = ['lt', 'pl', 'lv', 'et'].includes(language) ? language : 'lt';
mountCheckout(root, {
  language,
  country: { lt: 'LT', pl: 'PL', lv: 'LV', et: 'EE' }[language] || 'LT',
}).catch((error) => {
  console.error('Commerce preview:', error.message);
  root.replaceChildren();
  const p = document.createElement('p');
  p.setAttribute('role', 'alert');
  p.textContent = 'Nepavyko įkelti parduotuvės. Atnaujinkite puslapį.';
  root.append(p);
});
