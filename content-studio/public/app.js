const app = document.querySelector('#app');
const siteList = document.querySelector('#site-list');
const toastNode = document.querySelector('#toast');
const SITE_TIMEZONE = 'Europe/Vilnius';
const calendarClock = new Intl.DateTimeFormat('en-GB', { timeZone: SITE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function calendarParts(value) { return Object.fromEntries(calendarClock.formatToParts(new Date(value)).filter(part => part.type !== 'literal').map(part => [part.type, part.value])); }
const calendarDate = value => { const part = calendarParts(value); return `${part.year}-${part.month}-${part.day}`; };
const calendarMonthNow = () => calendarDate(new Date()).slice(0, 7);
const state = { sites: [], site: null, tab: 'overview', pageId: null, jobs: [], meta: null, search: '', calendar: [], network: { sites: [], catalog: [], links: [] }, calendarMonth: calendarMonthNow(), calendarSiteId: 'all' };

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const api = async (url, options = {}) => {
  const response = await fetch(url, { ...options, headers: { 'content-type': 'application/json', 'x-studio-request': '1', ...(options.headers || {}) }, cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Užklausa nepavyko.');
  return data;
};
const send = (url, method, body = {}) => api(url, { method, body: JSON.stringify(body) });
const siteUrl = (suffix = '') => `/api/sites/${encodeURIComponent(state.site.id)}${suffix}`;
const pageUrl = (id, suffix = '') => siteUrl(`/pages/${encodeURIComponent(id)}${suffix}`);
const fmt = value => value ? new Intl.DateTimeFormat('lt-LT', { timeZone: SITE_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)) : '—';
const localInput = value => { const part = calendarParts(value); return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`; };
function vilniusInputToIso(value) {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(String(value));
  if (!match) throw new Error('Įrašykite publikavimo datą ir laiką Lietuvos laiku.');
  const target = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]);
  let instant = target - 2 * 60 * 60 * 1000;
  for (let i = 0; i < 3; i++) {
    const part = calendarParts(instant);
    instant += target - Date.UTC(+part.year, +part.month - 1, +part.day, +part.hour, +part.minute);
  }
  if (localInput(instant) !== value) throw new Error('Šis Lietuvos laikas neegzistuoja dėl vasaros laiko keitimo. Pasirinkite kitą laiką.');
  return new Date(instant).toISOString();
}
const bodyText = blocks => (blocks || []).map(block => {
  if (block.type === 'heading') return `${'#'.repeat(block.level)} ${block.text}`;
  if (block.type === 'list') return block.items.map(item => `- ${item}`).join('\n');
  if (block.type === 'image') return `![vaizdas](asset:${block.assetId})`;
  return block.text || '';
}).join('\n\n');
const defaultEditorial = () => ({category:'',readingMinutes:0,authors:[],sources:[],datePublished:null,dateModified:null,productRecommendation:false,featuredImageId:null,relatedPageIds:[],commerceTargets:[]});
function parseBody(value) {
  const blocks = []; let paragraph = [];
  const flush = () => { if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.join(' ').trim() }); paragraph = []; };
  for (const line of String(value).split(/\r?\n/)) {
    const text = line.trim();
    if (!text) { flush(); continue; }
    const heading = /^(#{2,3})\s+(.+)$/.exec(text);
    const image = /^!\[[^\]]*\]\(asset:([a-f\d-]{36})\)$/.exec(text);
    if (heading) { flush(); blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] }); }
    else if (image) { flush(); blocks.push({ type: 'image', assetId: image[1] }); }
    else if (/^-\s+/.test(text)) {
      flush(); const previous = blocks.at(-1);
      if (previous?.type === 'list') previous.items.push(text.replace(/^-\s+/, ''));
      else blocks.push({ type: 'list', items: [text.replace(/^-\s+/, '')] });
    } else paragraph.push(text);
  }
  flush(); return blocks;
}
function notice(message, error = false) {
  toastNode.textContent = message; toastNode.className = `toast show${error ? ' error' : ''}`;
  clearTimeout(notice.timer); notice.timer = setTimeout(() => toastNode.className = 'toast', 4800);
}
const icon = type => ({ home: '⌂', service: '◈', product: '◇', guide: '▤', faq: '?', location: '⌖' })[type] || '▤';
const label = type => ({ home: 'Pradinis', service: 'Paslauga', product: 'Prekė', guide: 'Gidas', faq: 'DUK', location: 'Vietovė' })[type] || type;
const pill = page => page.publishedRevision ? `<span class="pill approved">${page.status === 'approved' ? (Date.parse(page.publishedRevision.publishAt) > Date.now() ? 'Patvirtinta ateities data' : 'Patvirtinta versija') : 'Patvirtinta ankstesnė versija'}</span>` : `<span class="pill">${page.status === 'revoked' ? 'Atšauktas' : 'Juodraštis'}</span>`;
const heading = (eyebrow, title, subtitle, buttons = '') => `<div class="eyebrow">${esc(eyebrow)}</div><div class="heading-row"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="heading-actions">${buttons}</div></div>`;
const calendarState = entry => entry.status === 'due' || entry.public ? ['due', 'Data atėjo · tikrinti domeną'] : entry.approved ? ['scheduled', 'Suplanuota pakete'] : entry.status === 'revoked' ? ['revoked', 'Atšaukta'] : entry.hasDraft ? ['draft', 'Juodraštis'] : ['planned', 'Planas'];
function calendarEntry(entry, compact = false) {
  const [status, statusText] = calendarState(entry);
  const part = calendarParts(entry.publishAt);
  const preview = entry.hasDraft && !compact ? `<a class="calendar-preview" href="/preview/${encodeURIComponent(entry.siteId)}/${encodeURIComponent(entry.pageId)}" target="_blank" rel="noopener" aria-label="Atidaryti juodraščio peržiūrą: ${esc(entry.title)}">Peržiūra ↗</a>` : '';
  return `<div class="calendar-entry ${status}"><button type="button" class="calendar-open" data-action="calendar-open" data-site="${esc(entry.siteId)}" data-id="${esc(entry.pageId)}" title="Atidaryti redaktoriuje"><span class="calendar-entry-time">${part.hour}:${part.minute}</span><strong>${esc(entry.title || 'Be pavadinimo')}</strong><small title="${esc(entry.canonicalHost)}${entry.cluster ? ` · ${esc(entry.cluster)}` : ''}">${esc(entry.canonicalHost)}${entry.cluster ? ` · ${esc(entry.cluster)}` : ''}</small>${entry.seasonalHook ? `<small class="calendar-season" title="${esc(entry.seasonalHook)}">${compact ? '◷ Sezoninė tema' : `◷ ${esc(entry.seasonalHook)}`}</small>` : ''}<span class="calendar-status ${status}">${compact && status === 'due' ? 'Tikrinti domeną' : statusText}</span>${entry.linkCounts && !compact ? `<small>Vidinės: ${entry.linkCounts.internal} · išorinės: ${entry.linkCounts.external} · tinklo planai: ${entry.linkCounts.networkPlanned}</small>` : ''}${entry.draftChanged ? '<span class="calendar-draft-changed">Yra naujesnis juodraštis</span>' : ''}</button>${preview}</div>`;
}
function calendarView(site = null) {
  const [year, month] = state.calendarMonth.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const selectedSiteId = site?.id || state.calendarSiteId;
  const entries = state.calendar.filter(entry => (!site && selectedSiteId === 'all' || entry.siteId === selectedSiteId) && calendarDate(entry.publishAt).slice(0, 7) === state.calendarMonth)
    .sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt) || a.title.localeCompare(b.title, 'lt'));
  const byDay = new Map();
  for (const entry of entries) { const key = calendarDate(entry.publishAt); byDay.set(key, [...(byDay.get(key) || []), entry]); }
  const today = calendarDate(new Date());
  const cells = Array.from({ length: leading }, () => '<div class="calendar-day empty-day" aria-hidden="true"></div>');
  const agenda = [];
  for (let day = 1; day <= days; day++) {
    const key = `${state.calendarMonth}-${String(day).padStart(2, '0')}`;
    const dayEntries = byDay.get(key) || [];
    cells.push(`<div class="calendar-day ${key === today ? 'today' : ''}"><div class="calendar-day-number">${day}<span>${dayEntries.length || ''}</span></div>${dayEntries.slice(0, 3).map(entry => calendarEntry(entry, true)).join('')}${dayEntries.length > 3 ? `<a class="calendar-more" href="#calendar-day-${key}">+${dayEntries.length - 3} daugiau ↓</a>` : ''}</div>`);
    if (dayEntries.length) agenda.push(`<section class="calendar-agenda-day" id="calendar-day-${key}"><h3>${day} ${new Intl.DateTimeFormat('lt-LT', { month: 'long', timeZone: 'UTC' }).format(first)}</h3>${dayEntries.map(entry => calendarEntry(entry)).join('')}</section>`);
  }
  const monthTitle = new Intl.DateTimeFormat('lt-LT', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  const filter = site ? `<span class="calendar-site-tag">${esc(site.canonicalHost)}</span>` : `<label class="calendar-filter">Svetainė <select id="calendar-site-filter" aria-label="Filtruoti kalendorių pagal svetainę"><option value="all">Visos svetainės</option>${state.sites.map(item => `<option value="${esc(item.id)}" ${selectedSiteId === item.id ? 'selected' : ''}>${esc(item.canonicalHost)}</option>`).join('')}</select></label>`;
  const actions = site ? `<div class="split-actions calendar-actions"><button class="btn btn-primary" data-action="autopilot" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>✦ Automatiškai suplanuoti ir parengti</button><button class="btn" data-action="plan" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>Tik planuoti 6 mėn.</button><button class="btn" data-action="generate-drafts" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>Tik generuoti juodraščius</button><span class="calendar-action-note">Automatika parengia juodraščius. Faktų ir šaltinių išimtys tikrinamos prieš patvirtinimą; viešai ji pati nepublikuoja.</span></div>` : '';
  return `${site ? '' : heading('Redakcinis kalendorius', 'Publikacijų planas', 'Visų domenų įrašai, datos ir juodraščiai vienoje vietoje.', '<button class="btn" data-action="dashboard">← Portfelis</button>')}${actions}<section class="card calendar-card"><div class="calendar-toolbar"><div><h2>${esc(monthTitle)}</h2><p>${entries.length} įrašai · Laikas: Lietuva (${SITE_TIMEZONE})</p></div><div class="calendar-toolbar-controls">${filter}<div class="calendar-month-nav"><button type="button" class="btn btn-small" data-action="calendar-prev" aria-label="Ankstesnis mėnuo">←</button><button type="button" class="btn btn-small" data-action="calendar-today">Šiandien</button><button type="button" class="btn btn-small" data-action="calendar-next" aria-label="Kitas mėnuo">→</button></div></div></div><div class="calendar-weekdays">${['Pr','An','Tr','Kt','Pn','Št','Sk'].map(day => `<span>${day}</span>`).join('')}</div><div class="calendar-grid">${cells.join('')}</div><div class="calendar-agenda-heading">Visi mėnesio įrašai</div><div class="calendar-agenda">${agenda.join('') || '<div class="empty">Šį mėnesį įrašų nėra. Pasirinkite kitą mėnesį arba suplanuokite turinį.</div>'}</div></section>`;
}
function sidebar() {
  document.querySelector('#site-count').textContent = state.sites.length;
  const sites = state.sites.filter(site => `${site.name} ${site.canonicalHost}`.toLowerCase().includes(state.search));
  siteList.innerHTML = sites.map(site => `<button type="button" class="site-item ${state.site?.id === site.id ? 'active' : ''}" data-action="open-site" data-id="${esc(site.id)}"><span class="site-icon">${esc(site.name[0] || '?')}</span><span>${esc(site.canonicalHost)}</span></button>`).join('') || '<p class="empty">Domenų nerasta.</p>';
}
const networkStatusLabel = status => ({missing:'Tikslas nerastas',internal:'Naudoti vidinę nuorodą',unapproved:'Laukia tikslo patvirtinimo',scheduled:'Laukia publikavimo datos',revoked:'Tikslas atšauktas','not-live':'Domenas dar nepaleistas','no-anchor':'Tekste trūksta konteksto','needs-check':'Reikia HTTPS patikros',ready:'Patikrinta, laukia šaltinio publikavimo'}[status] || status);
function networkRows(links) {
  return links.length ? '<div class="network-links">' + links.map(link => '<article class="network-link"><div><strong>' + esc(link.sourceDomain) + '</strong><small>' + esc(link.sourceTitle) + ' · ' + fmt(link.sourcePublishAt) + '</small><button class="btn btn-small" data-action="calendar-open" data-site="' + esc(link.sourceSiteId) + '" data-id="' + esc(link.sourcePageId) + '">Atidaryti juodraštį</button></div><div><strong>' + esc(link.label) + '</strong><p>' + esc(link.reason) + '</p><small>→ ' + esc(link.target?.url || link.targetSiteId) + '</small><small>' + esc(networkStatusLabel(link.status)) + (link.placement >= 0 ? ' · teksto blokas ' + (link.placement + 1) : '') + '</small>' + (link.evidence ? '<small>HTTPS patikra: ' + fmt(link.evidence.checkedAt) + '</small>' : '') + (link.checkError ? '<p class="error">' + esc(link.checkError) + '</p>' : '') + '</div></article>').join('') + '</div>' : '<div class="empty">Kontekstinių tinklo ryšių dar nesuplanuota. Agentas juos siūlo tik radęs skaitytojui naudingą susijusį atsakymą.</div>';
}
function networkView(site = null) {
  const links = state.network.links.filter(link => !site || link.sourceSiteId === site.id || link.targetSiteId === site.id);
  const sites = state.network.sites.filter(item => !site || item.id === site.id);
  return heading('Turinio ryšiai', site ? 'Šios svetainės nuorodų planas' : 'Viso tinklo nuorodų planas', 'Matomi suplanuoti kontekstai, tikslai, datos ir priklausomybės. Patikra nepakeičia turinio peržiūros ar patvirtinimo.', '<button class="btn" data-action="calendar-all">Kalendorius</button>') + '<section class="card"><div class="card-head"><h2>Ryšiai tarp publikacijų</h2><small>' + links.length + ' planų</small></div><div class="card-body">' + networkRows(links) + '</div></section><section class="card"><div class="card-head"><h2>Domenų aprėptis</h2><small>Skaičiai yra planas, ne backlinkų ar autoriteto matavimas</small></div><div class="card-body"><div class="network-domain-list">' + sites.map(item => '<div><strong>' + esc(item.domain) + '</strong><span>Numatyta į kitus: ' + item.outgoing + ' · iš kitų: ' + item.incoming + '</span></div>').join('') + '</div></div></section>';
}
function dashboard() {
  const sites = state.sites, pages = sites.reduce((sum, site) => sum + site.pages, 0), approved = sites.reduce((sum, site) => sum + site.approved, 0), ready = sites.filter(site => site.ready).length;
  return heading('Darbo erdvė', 'Visų svetainių turinys', 'Agentas parenka temas, datas ir rengia juodraščius kiekvienam domenui.', '<button class="btn" data-action="network-all">Nuorodų planas</button><button class="btn" data-action="calendar-all">Kalendorius</button><button class="btn btn-primary" data-action="new-site">＋ Pridėti svetainę</button>') +
    `<div class="metrics"><div class="metric"><div class="metric-label">Domenų plane</div><div class="metric-value">${sites.length}</div><div class="metric-hint">Atskiri verslai</div></div><div class="metric"><div class="metric-label">Suplanuoti puslapiai</div><div class="metric-value">${pages}</div><div class="metric-hint">Visame portfelyje</div></div><div class="metric"><div class="metric-label">Patvirtinti tekstai</div><div class="metric-value">${approved}</div><div class="metric-hint">Parengti eksportui</div></div><div class="metric"><div class="metric-label">Užpildyti kontaktai</div><div class="metric-value">${ready}</div><div class="metric-hint">Su faktų aprašu</div></div></div>` +
    `<div class="grid"><section class="card"><div class="card-head"><h2>Svetainių portfelis</h2><small>${sites.length} domenų</small></div><div class="card-body"><div class="page-list">${sites.slice(0, 8).map(site => `<div class="page-row"><span class="page-symbol">${esc(site.name[0])}</span><span class="page-name"><strong>${esc(site.canonicalHost)}</strong><small>${esc(site.offer)}</small></span><button class="btn btn-small" data-action="open-site" data-id="${esc(site.id)}">Atidaryti</button></div>`).join('')}</div></div></section><section class="card"><div class="card-head"><h2>Autonominė eiga</h2></div><div class="card-body"><ol class="steps"><li>Kiekvienai nišai atskiriami patvirtinti verslo faktai ir hipotezės.</li><li>Codex CLI suplanuoja savitas temas, klasterius ir sezonines datas.</li><li>Agentas parengia privačius juodraščius, nuorodų bei šaltinių kandidatus.</li><li>Faktų patikros ir diegimo vartai saugo nuo nepagrįsto viešinimo.</li></ol><div class="hint">Dabartinis autopilotas baigiasi juodraščiais; patikra ir diegimas dar automatizuojami. Publikavimo data veikia iš jau įdiegto patvirtinto paketo.</div></div></section></div>`;
}
function newSiteView() {
  return heading('Naujas domenas', 'Pridėti svetainę', 'Pradėkite nuo domeno ir vieno tikro verslo pasiūlymo.') + `<section class="card"><div class="card-body"><form data-form="new-site"><div class="form-grid"><label class="field"><span>Domenas</span><input required name="canonicalHost" placeholder="pavyzdys.lt"></label><label class="field"><span>Svetainės pavadinimas</span><input required name="name" placeholder="Pavyzdžio paslaugos"></label></div><label class="field"><span>Pasiūlymas</span><textarea name="offer" placeholder="Trumpai aprašykite, dėl ko lankytojas galės kreiptis."></textarea></label><button class="btn btn-primary" type="submit">Sukurti svetainę</button></form></div></section>`;
}
function overview(site) {
  const factState = site.facts ? 'Įrašyta' : 'Trūksta';
  return `<div class="grid"><section class="card"><div class="card-head"><h2>Verslo aprašas</h2><small>Generavimo pagrindas</small></div><div class="card-body"><form data-form="site"><div class="form-grid"><label class="field"><span>Pavadinimas</span><input name="name" value="${esc(site.name)}" required></label><label class="field"><span>Spalva</span><input name="accent" type="color" value="${esc(site.brand.accent)}"></label></div><label class="field"><span>Pagrindinis pasiūlymas</span><textarea name="offer">${esc(site.offer)}</textarea></label><label class="field"><span>Kam skirta</span><textarea name="audience" placeholder="Kas yra tikslinis klientas?">${esc(site.audience)}</textarea></label><label class="field"><span>Patikrinti verslo faktai</span><textarea name="facts" style="min-height:160px" placeholder="Paslaugos, teritorija, darbo būdas, tikros sąlygos. Neįrašykite spėjimų.">${esc(site.facts)}</textarea><small>Šie faktai naudojami „Codex CLI“ užduotyse. Generuoti teiginiai tikrinami prieš publikavimą.</small></label><button class="btn btn-primary" type="submit">Išsaugoti aprašą</button></form></div></section><div><section class="card"><div class="card-head"><h2>Kontaktai</h2><small>Reikalingi publikavimui</small></div><div class="card-body"><form data-form="contact"><label class="field"><span>El. paštas</span><input type="email" name="email" value="${esc(site.contact.email)}" placeholder="labas@${esc(site.canonicalHost)}"></label><label class="field"><span>Telefonas (neprivalomas)</span><input name="phone" value="${esc(site.contact.phone)}" placeholder="+370 ..."></label><button class="btn" type="submit">Išsaugoti kontaktus</button></form></div></section><section class="card"><div class="card-head"><h2>Parengtis</h2></div><div class="card-body"><div class="activity"><span class="activity-icon">✓</span><div><strong>Domenas užregistruotas plane</strong><small>${esc(site.canonicalHost)}</small></div></div><div class="activity"><span class="activity-icon">${site.facts ? '✓' : '·'}</span><div><strong>Patikrinti faktai</strong><small>${factState}</small></div></div><div class="activity"><span class="activity-icon">${site.contact.email ? '✓' : '·'}</span><div><strong>Kontaktai</strong><small>${site.contact.email ? 'Įrašyti' : 'Dar neužpildyti'}</small></div></div><div class="activity"><span class="activity-icon">${site.pages.filter(page => page.publishedRevision).length ? '✓' : '·'}</span><div><strong>Patvirtintas turinys</strong><small>${site.pages.filter(page => page.publishedRevision).length} puslapiai</small></div></div></div></section></div></div>`;
}
function pagesView(site) {
  const pages = [...site.pages].sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));
  return `<section class="card"><div class="card-head"><h2>Puslapių planas</h2><button class="btn btn-small btn-primary" data-action="add-page">＋ Naujas puslapis</button></div><div class="card-body"><div class="hint">Publikavimo laikas veikia tik jau įdiegtam patvirtintam paketui. Prieš tvirtinimą patikrinkite faktus, nuorodas ir šaltinius. Autopilotas suplanuoja temas ir parengia juodraščius. Faktų bei šaltinių išimtys tikrinamos prieš patvirtinimą; viešai jis pats nepublikuoja.</div><div class="split-actions" style="margin-bottom:18px"><button class="btn btn-primary" data-action="autopilot" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>✦ Automatiškai suplanuoti ir parengti</button><button class="btn" data-action="plan" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>Tik planuoti 6 mėn.</button><button class="btn" data-action="generate-drafts" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''}>Tik generuoti juodraščius</button><button class="btn" data-action="tab" data-tab="calendar">Kalendorius</button><button class="btn" data-action="jobs">Darbai</button></div><div class="page-list">${pages.length ? pages.map(page => `<div class="page-row"><span class="page-symbol">${icon(page.type)}</span><span class="page-name"><strong>${esc(page.title || 'Be pavadinimo')}</strong><small>/${esc(page.slug)} · ${label(page.type)} · ${fmt(page.publishAt)} (Lietuvos laiku)${page.cluster ? ` · ${esc(page.cluster)}` : ''}${page.seasonalHook ? ` · ${esc(page.seasonalHook)}` : ''}</small></span><span class="row-actions">${pill(page)}<button class="btn btn-small" data-action="edit-page" data-id="${esc(page.id)}">Redaguoti</button>${page.body?.length ? `<a class="btn btn-small" href="/preview/${esc(site.id)}/${esc(page.id)}" target="_blank" rel="noopener">Juodraštis ↗</a>` : ''}</span></div>`).join('') : '<div class="empty"><strong>Puslapių dar nėra.</strong>Pridėkite pirmą puslapį arba suplanuokite temas su „Codex CLI“.</div>'}</div></div></section>`;
}
function externalLinkRow(link = {}) {
  return `<div class="external-link-row" data-external-link-row><div class="form-grid"><label class="field"><span>Šaltinio URL</span><input type="url" data-external-url value="${esc(link.url || '')}" placeholder="https://..."></label><label class="field"><span>Nuorodos tekstas</span><input data-external-label value="${esc(link.label || '')}" placeholder="Šaltinio pavadinimas"></label></div><label class="field"><span>Ką šaltinis pagrindžia</span><input data-external-reason value="${esc(link.reason || '')}" placeholder="Konkretus teiginys arba nauda skaitytojui"></label><div class="external-link-actions"><label><input type="checkbox" data-external-verified ${link.verified ? 'checked' : ''}> Perskaičiau ir patikrinau</label><button type="button" class="btn btn-small" data-action="remove-external-link">Šalinti</button></div></div>`;
}
function pageEditor(site, page) {
  const isNew = !page;
  const existing = page || { type: 'guide', slug: '', title: '', description: '', intent: '', cluster: '', seasonalHook: '', pillarPageId: '', body: [], publishAt: new Date().toISOString(), media: [], links: [], externalLinks: [] };
  const v2=site.schemaVersion===2;
  const date = localInput(existing.publishAt);
  const assets = imageFamilies(site).map(asset => `<label class="activity"><input type="checkbox" name="asset" value="${esc(asset.id)}" ${existing.media.some(item => item.id === asset.id || (asset.groupId && site.assets.find(a=>a.id===item.id)?.groupId===asset.groupId)) ? 'checked' : ''}><div><strong>${esc(asset.alt)}</strong><small>${asset.groupId ? `${site.assets.filter(a=>a.groupId===asset.groupId).map(a=>a.width).join(' / ')} px · visi dydžiai priskiriami kartu` : esc(asset.src)}</small></div></label>`).join('') || '<p>Vaizdų dar nėra. Pridėkite juos skiltyje „Vaizdai“.</p>';
  const links = site.pages.filter(item => item.id !== page?.id).map(item => {
    const current = existing.links.find(link => link.targetPageId === item.id);
    return `<div class="internal-link-row" data-internal-link-row><label class="internal-link-target"><input type="checkbox" name="link" value="${esc(item.id)}" ${current ? 'checked' : ''}><span><strong>${esc(item.title)}</strong><small>/${esc(item.slug)}${item.cluster ? ` · ${esc(item.cluster)}` : ''}</small></span></label><input data-internal-link-label aria-label="Nuorodos tekstas į ${esc(item.title)}" value="${esc(current?.label || item.title)}" placeholder="Tikslus nuorodos tekstas"></div>`;
  }).join('') || '<p>Kitų puslapių kol kas nėra.</p>';
  const external = (existing.externalLinks || []).map(externalLinkRow).join('') + externalLinkRow();
  const pillarOptions = site.pages.filter(item => item.id !== page?.id).map(item => `<option value="${esc(item.id)}" ${existing.pillarPageId === item.id ? 'selected' : ''}>${esc(item.title || item.slug || 'Pradinis puslapis')}</option>`).join('');
  const sourceQueries = Array.isArray(existing.sourceQueries) ? existing.sourceQueries : [];
  const linkSuggestions = Array.isArray(existing.linkSuggestions) ? existing.linkSuggestions : [];
  const editorialCard = `<section class="card"><div class="card-head"><h2>Redakcinis planas</h2><small>Ne viešas turinys</small></div><div class="card-body"><p>${esc(existing.editorialReason || 'Šio puslapio temos pagrindimas dar neįrašytas.')}</p><h3 class="attachment-heading">Šaltinių paieškos užklausos</h3>${sourceQueries.length ? `<ul class="editorial-list">${sourceQueries.map(query => `<li>${esc(query)}</li>`).join('')}</ul>` : '<p>Paieškos užklausų dar nėra. Šaltinius būtina atskirai rasti ir perskaityti.</p>'}<h3 class="attachment-heading">Siūlomos vidinės nuorodos</h3>${linkSuggestions.length ? `<div class="suggestion-list">${linkSuggestions.map(suggestion => { const target = site.pages.find(item => item.id === suggestion.targetPageId); return `<div class="suggestion"><div><strong>${esc(suggestion.label || target?.title || 'Susijęs puslapis')}</strong><small>${esc(suggestion.reason || '')}</small><small>${target ? `/${esc(target.slug)} · ${target.publishedRevision ? 'Patvirtintas' : 'Dar nepatvirtintas'}` : 'Tikslinis puslapis nerastas'}</small></div>${target ? `<button type="button" class="btn btn-small" data-action="calendar-open" data-site="${esc(site.id)}" data-id="${esc(target.id)}">Atidaryti</button>` : ''}</div>`; }).join('')}</div>` : '<p>Siūlomų nuorodų dar nėra.</p>'}<p class="editorial-note">Šie ryšiai yra planas. Viešose nuorodose galima naudoti tik patvirtintus tikslinius puslapius; nepatvirtintus palikite planavimo sąraše.</p></div></section>`;
  const networkCard = '<section class="card"><div class="card-head"><h2>Nuorodos į kitus mūsų portalus</h2></div><div class="card-body">' + networkRows(state.network.links.filter(link => link.sourceSiteId === site.id && link.sourcePageId === page?.id)) + (page ? '<button class="btn" data-action="verify-network" data-id="' + esc(page.id) + '">Patikrinti tikslo pasiekiamumą</button>' : '') + '</div></section>';
  const contentCard = `<section class="card"><div class="card-head"><h2>Puslapio turinys</h2>${page ? pill(page) : ''}</div><div class="card-body"><form data-form="page">
    <div class="form-grid"><label class="field"><span>Tipas</span><select name="type">${['home','service','product','guide','faq','location',...(v2?['article','index','author','policy','about','contact']:[])].map(type => `<option value="${type}" ${existing.type === type ? 'selected' : ''}>${label(type)}</option>`).join('')}</select></label><label class="field"><span>URL kelias</span><input name="slug" value="${esc(existing.slug)}" placeholder="gidas/tema"><small>Pradiniam puslapiui palikite tuščią.</small></label></div>
    <label class="field"><span>Antraštė</span><input required name="title" value="${esc(existing.title)}"></label>
    <label class="field"><span>Meta aprašymas</span><textarea name="description" style="min-height:75px">${esc(existing.description)}</textarea></label>
    <label class="field"><span>Paieškos ketinimas</span><input name="intent" value="${esc(existing.intent)}" placeholder="Kokį klausimą ar poreikį puslapis sprendžia?"></label>
    <div class="form-grid"><label class="field"><span>Teminis klasteris</span><input name="cluster" value="${esc(existing.cluster || '')}" placeholder="Pvz. traktoriaus padangų dydžiai"><small>Redakcinė grupė, kurios turinys atsako į susijusius klausimus.</small></label><label class="field"><span>Pagrindinis klasterio puslapis</span><select name="pillarPageId"><option value="">Nėra / šis puslapis yra pagrindinis</option>${pillarOptions}</select></label></div>
    <label class="field"><span>Kodėl ši publikavimo data</span><input name="seasonalHook" value="${esc(existing.seasonalHook || '')}" placeholder="Pvz. pasirengimas pavasario lauko darbams"><small>Sezoniškumo ryšys yra redakcinis paaiškinimas, o ne viešas pažadas.</small></label>
    <label class="field"><span>Turinys${v2?' · struktūrizuoti v2 blokai':''}</span><textarea name="body" style="min-height:350px">${esc(v2?JSON.stringify(existing.body,null,2):bodyText(existing.body))}</textarea><small>${v2?'JSON išsaugo nuorodų vietas ir blokų seką. Netinkami blokai atmetami; tekstas netrumpinamas.':'## ir ### – antraštės, - – sąrašai, ![vaizdas](asset:ID) – priskirtas vaizdas.'}</small></label>
    ${v2?`<label class="field"><span>Redakcinė versija · autoriai, šaltiniai, datos ir rekomendacijos</span><textarea name="editorial" style="min-height:250px">${esc(JSON.stringify(existing.editorial||defaultEditorial(),null,2))}</textarea><small>Šie snapshot duomenys yra patvirtinimo dalis. Privatūs šaltiniai saugomi migracijos dokumentuose.</small></label>`:''}
    <label class="field"><span>Publikavimo laikas</span><input required name="publishAt" type="datetime-local" value="${esc(date)}"><small>Lietuvos laikas (Europe/Vilnius). Rodymas prasidės tik patvirtintam ir įdiegtam puslapiui.</small></label>
    <label class="field"><span>Atviri faktų klausimai</span><textarea name="factChecks" placeholder="Vienas klausimas eilutėje. Ištrinkite tik patikrinę faktą ir pataisę tekstą arba verslo aprašą.">${esc((existing.factChecks || []).join('\n'))}</textarea></label>
    <button class="btn btn-primary" type="submit">${isNew ? 'Pridėti juodraštį' : 'Išsaugoti pakeitimus'}</button>
  </form></div></section>`;
  const assistantCard = `<section class="card"><div class="card-head"><h2>Codex CLI</h2></div><div class="card-body"><p>Pagal verslo faktus ir šio puslapio tikslą bus parengtas redaguojamas juodraštis.</p><button class="btn" ${site.schemaVersion === 2 ? 'disabled title="V2 generavimo sutartis dar nepritaikyta"' : ''} data-action="generate-page" data-id="${esc(page?.id || '')}" ${isNew ? 'disabled' : ''}>✦ Generuoti juodraštį</button>${page?.factChecks?.length ? `<div class="hint" style="margin-top:15px"><strong>Patikrinti prieš tvirtinimą:</strong><ul>${page.factChecks.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}</div></section>`;
  const attachmentsCard = `<section class="card"><div class="card-head"><h2>Vaizdai ir nuorodos</h2></div><div class="card-body"><form data-form="attachments"><h3 class="attachment-heading">Puslapio vaizdai</h3>${assets}<h3 class="attachment-heading">Vidinės klasterio nuorodos</h3><p>Prieš patvirtinimą nuorodų tiksliniai puslapiai turi būti patvirtinti. Ateities idėjas rasite redakciniame plane.</p>${links}<h3 class="attachment-heading">Išoriniai šaltiniai</h3><p>Nuoroda turi padėti skaitytojui patikrinti konkretų teiginį. Pažymėkite „patikrinau“ tik perskaitę šaltinį.</p><div id="external-link-list">${external}</div><button class="btn btn-small" type="button" data-action="add-external-link">＋ Pridėti šaltinį</button><div><button class="btn" style="margin-top:13px" type="submit" ${isNew ? 'disabled' : ''}>Išsaugoti vaizdus ir nuorodas</button></div></form></div></section>`;
  const publicationCard = page ? `<section class="card"><div class="card-head"><h2>Publikavimo kontrolė</h2></div><div class="card-body"><p>Patvirtinimas susiejamas su turinio kontrolinė suma. Redagavus, ankstesnė patvirtinta versija lieka pakete, kol patvirtinsite naują.</p><div class="split-actions"><button class="btn btn-primary" data-action="approve-page" data-id="${esc(page.id)}">✓ Patvirtinti versiją</button><button class="btn btn-warn" data-action="revoke-page" data-id="${esc(page.id)}">Atšaukti</button><a class="btn" href="/preview/${esc(site.id)}/${esc(page.id)}" target="_blank" rel="noopener">Juodraščio peržiūra ↗</a></div></div></section>` : '';
  return heading('Turinio redaktorius', isNew ? 'Naujas puslapis' : existing.title, isNew ? 'Sukurkite URL ir turinio juodraštį.' : `/${existing.slug} · ${label(existing.type)}`, `<button class="btn" data-action="pages">← Puslapių sąrašas</button>${page && !page.publishedRevision ? `<button class="btn btn-warn" data-action="delete-page" data-id="${esc(page.id)}">Šalinti juodraštį</button>` : ''}`) + `<div class="grid">${contentCard}<div>${editorialCard}${networkCard}${assistantCard}${attachmentsCard}${publicationCard}</div></div>`;
}
function imageFamilies(site) {
  const seen=new Set();return [...site.assets].sort((a,b)=>b.width-a.width).filter(a=>{const key=a.groupId||a.id;if(seen.has(key))return false;seen.add(key);return true;});
}
function mediaView(site) {
  return `<div class="grid"><section class="card"><div class="card-head"><h2>Vaizdų biblioteka</h2><small>${site.assets.length} failai</small></div><div class="card-body">${site.assets.length ? `<div class="asset-grid">${imageFamilies(site).map(asset => `<div class="asset-card"><img src="/api/media/${esc(site.id)}/${esc(asset.src.split('/').at(-1))}" alt="${esc(asset.alt)}" width="${asset.width}" height="${asset.height}" loading="lazy"><div><strong>${esc(asset.alt)}</strong><small>${asset.width} × ${asset.height}${asset.groupId ? ' · '+site.assets.filter(a=>a.groupId===asset.groupId).length+' WebP dydžiai' : ''}</small><code>${esc(asset.id)}</code></div></div>`).join('')}</div>` : '<div class="empty"><strong>Vaizdų dar nėra.</strong>Importuokite „ImageGen“ rezultatą arba sugeneruokite naują.</div>'}</div></section><div><section class="card"><div class="card-head"><h2>ImageGen užduotis</h2></div><div class="card-body"><p>${state.meta?.imagegenConfigured ? 'Naudojamas oficialus ImageGen CLI su šio kompiuterio OPENAI_API_KEY.' : 'Automatiniam paleidimui reikia OPENAI_API_KEY. Galite nukopijuoti užduotį ir naudoti Codex integruotą imagegen įrankį, tada importuoti rezultatą.'}</p><form data-form="imagegen"><label class="field"><span>Vaizdo užduotis</span><textarea name="prompt" required placeholder="Originali temą aiškinanti nuotrauka, kompozicija, fonas, apšvietimas. Venkite netikrų prekių ir logotipų."></textarea></label><label class="field"><span>Alt tekstas</span><input name="alt" required placeholder="Kas matoma vaizde"></label><div class="split-actions"><button class="btn btn-primary" type="submit" ${state.meta?.imagegenConfigured ? '' : 'disabled'}>✦ Generuoti vaizdą</button><button class="btn" type="button" data-action="copy-image-prompt">Kopijuoti užduotį</button></div></form></div></section><section class="card"><div class="card-head"><h2>Importuoti vaizdą</h2></div><div class="card-body"><form data-form="upload"><label class="field"><span>PNG, JPEG arba WebP · iki 12 MB</span><input type="file" name="file" accept="image/png,image/jpeg,image/webp" required></label><label class="field"><span>Alt tekstas</span><input name="alt" required></label><label class="field"><span>Naudojimo teisės / kilmė</span><input name="rights" required placeholder="Pvz. ImageGen originalas, mūsų nuotrauka"></label><button class="btn" type="submit">Importuoti ir optimizuoti WebP</button><p>Automatiškai paruošiami 360 / 640 / 800 / 1200 / 1600 px variantai pagal originalo dydį. Originalas saugomas privačiai; puslapiui pakanka pasirinkti vieną vaizdą.</p></form></div></section></div></div>`;
}
function jobsView() {
  const names = { autopilot: 'Automatinis planavimas ir juodraščiai', plan: 'Šešių mėnesių temų planas', draft: 'Puslapio juodraštis', 'draft-batch': 'Suplanuotų juodraščių generavimas', 'network-check': 'Tinklo nuorodų patikra', image: 'ImageGen vaizdas' };
  return `<section class="card"><div class="card-head"><h2>Generavimo darbai</h2><button class="btn btn-small" data-action="reload-jobs">↻ Atnaujinti</button></div><div class="card-body"><div class="job-list">${state.jobs.length ? state.jobs.filter(job => !state.site || job.siteId === state.site.id).map(job => `<div class="job-row"><div><strong>${esc(names[job.type] || job.type)}</strong><small>${esc(job.siteId)} · ${fmt(job.startedAt || job.finishedAt)}</small>${job.error ? `<div class="error">${esc(job.error)}</div>` : job.detail ? `<small>${esc(job.detail)}</small>` : ''}</div><span class="pill ${esc(job.status)}">${{queued:'Eilėje',running:'Vykdoma',complete:'Baigta',failed:'Klaida'}[job.status] || esc(job.status)}</span></div>`).join('') || '<div class="empty">Šiai svetainei darbų dar nėra.</div>' : '<div class="empty">Generavimo darbų dar nėra.</div>'}</div></div></section>`;
}
function exportView(site) {
  const approved = site.pages.filter(page => page.publishedRevision);
  return `<div class="grid"><section class="card"><div class="card-head"><h2>Svetainės paketas</h2><small>JSON schema v${site.schemaVersion === 2 ? 2 : 1}</small></div><div class="card-body"><p>Eksportas sukuria vieno domeno paketą su patvirtintomis puslapių versijomis ir reikalingais vaizdais. Viešas svetainės variklis pats patikrina kontrolines sumas ir publikavimo datą.</p><div class="activity"><span class="activity-icon">▤</span><div><strong>${approved.length} patvirtinti puslapiai</strong><small>${site.pages.length - approved.length} likę juodraščiai</small></div></div><div class="activity"><span class="activity-icon">⌂</span><div><strong>${esc(site.canonicalHost)}</strong><small>Atskiras kanoninis domenas</small></div></div><button class="btn btn-primary" data-action="export" ${approved.length ? '' : 'disabled'}>Eksportuoti paketą ↗</button><div id="export-result" class="hint" style="display:none;margin-top:18px"></div></div></section><section class="card"><div class="card-head"><h2>Prieš įdiegiant</h2></div><div class="card-body"><ol class="steps"><li>Patikrinkite verslo faktus, teiginius ir kontaktų veikimą.</li><li>Peržiūrėkite tik patvirtintus puslapius ir vaizdų teises.</li><li>Patikrinkite URL, vidines nuorodas, canonical ir sitemap.</li><li>Įdiekite paketą per svetainių variklį ir patikrinkite Lighthouse.</li></ol></div></section></div>`;
}
function siteView(site) {
  const tab = state.tab;
  const content = tab === 'overview' ? overview(site) : tab === 'pages' ? pagesView(site) : tab === 'calendar' ? calendarView(site) : tab === 'network' ? networkView(site) : tab === 'media' ? mediaView(site) : tab === 'jobs' ? jobsView() : tab === 'export' ? exportView(site) : pageEditor(site, site.pages.find(item => item.id === state.pageId));
  return `<span class="site-domain">${esc(site.canonicalHost)}</span>` + heading('Svetainė', site.name, site.offer || 'Pasiūlymo aprašas dar neužpildytas.', `<button class="btn" data-action="calendar-all">Visų svetainių kalendorius</button><button class="btn" data-action="dashboard">Visas portfelis</button>`) + `<nav class="tabs" aria-label="Svetainės skiltys">${[['overview','Apžvalga'],['pages','Puslapiai'],['calendar','Kalendorius'],['network','Nuorodų planas'],['media','Vaizdai'],['jobs','Darbai'],['export','Eksportas']].map(([key, text]) => `<button type="button" class="tab ${tab === key ? 'active' : ''}" data-action="tab" data-tab="${key}">${text}</button>`).join('')}</nav>` + content;
}
function render() {
  sidebar();
  document.querySelector('#crumb').textContent = state.site ? state.site.canonicalHost : state.tab === 'calendar' ? 'Kalendorius' : 'Portfelis';
  app.innerHTML = state.tab === 'new-site' ? newSiteView() : state.site ? siteView(state.site) : state.tab === 'calendar' ? calendarView() : state.tab === 'network' ? networkView() : dashboard();
}
async function refresh(full = true) {
  const [sites, jobs, meta, calendar, network] = await Promise.all([api('/api/sites'), api('/api/jobs'), state.meta ? Promise.resolve(state.meta) : api('/api/meta'), api('/api/calendar'), api('/api/network-links')]);
  state.sites = sites; state.jobs = jobs; state.meta = meta; state.calendar = calendar; state.network = network;
  if (full && state.site) state.site = await api(`/api/sites/${encodeURIComponent(state.site.id)}`);
  render();
}
async function openSite(id) { state.site = await api(`/api/sites/${encodeURIComponent(id)}`); state.tab = 'overview'; state.pageId = null; location.hash = encodeURIComponent(id); render(); }

document.querySelector('#site-search').addEventListener('input', event => { state.search = event.target.value.toLowerCase(); sidebar(); });
document.querySelector('#add-site-button').addEventListener('click', () => { state.site = null; state.tab = 'new-site'; render(); });
document.querySelector('#refresh-button').addEventListener('click', () => refresh().then(() => notice('Duomenys atnaujinti.')).catch(error => notice(error.message, true)));
document.addEventListener('change', event => {
  if (event.target.id === 'calendar-site-filter') { state.calendarSiteId = event.target.value; render(); }
});

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action; const id = button.dataset.id;
  button.disabled = true;
  try {
    if (action === 'open-site') await openSite(id);
    else if (action === 'dashboard') { state.site = null; state.tab = 'overview'; location.hash = ''; render(); }
    else if (action === 'network-all') { state.site = null; state.tab = 'network'; state.pageId = null; location.hash = ''; render(); }
    else if (action === 'verify-network') { await send(pageUrl(id, '/verify-network'), 'POST'); state.tab = 'jobs'; await refresh(); notice('Tinklo tikslų patikra pradėta; turinys automatiškai nepatvirtinamas.'); }
    else if (action === 'calendar-all') { state.site = null; state.tab = 'calendar'; state.pageId = null; location.hash = ''; render(); }
    else if (action === 'calendar-prev' || action === 'calendar-next' || action === 'calendar-today') {
      if (action === 'calendar-today') state.calendarMonth = calendarMonthNow();
      else { const [year, month] = state.calendarMonth.split('-').map(Number); const next = new Date(Date.UTC(year, month - 1 + (action === 'calendar-next' ? 1 : -1), 1)); state.calendarMonth = next.toISOString().slice(0, 7); }
      render();
    }
    else if (action === 'calendar-open') { await openSite(button.dataset.site); state.pageId = id; state.tab = 'page'; render(); }
    else if (action === 'new-site') { state.site = null; state.tab = 'new-site'; render(); }
    else if (action === 'tab') { state.tab = button.dataset.tab; state.pageId = null; render(); }
    else if (action === 'pages') { state.tab = 'pages'; state.pageId = null; render(); }
    else if (action === 'jobs' || action === 'reload-jobs') { state.jobs = await api('/api/jobs'); state.tab = 'jobs'; render(); }
    else if (action === 'add-page') { state.pageId = null; state.tab = 'page'; render(); }
    else if (action === 'edit-page') { state.pageId = id; state.tab = 'page'; render(); }
    else if (action === 'autopilot') { await send(siteUrl('/autopilot'), 'POST'); state.tab = 'jobs'; await refresh(); notice('Automatinis planavimas ir juodraščių rengimas pradėtas.'); }
    else if (action === 'plan') { await send(siteUrl('/plan'), 'POST', { months: 6 }); state.tab = 'jobs'; await refresh(); notice('Šešių mėnesių temų planavimas pradėtas.'); }
    else if (action === 'generate-drafts') { await send(siteUrl('/drafts/generate'), 'POST'); state.tab = 'jobs'; await refresh(); notice('Suplanuotų juodraščių generavimas pradėtas.'); }
    else if (action === 'generate-page') { await send(pageUrl(id, '/generate'), 'POST'); state.tab = 'jobs'; await refresh(); notice('Juodraščio generavimas pradėtas.'); }
    else if (action === 'approve-page') { await send(pageUrl(id, '/approve'), 'POST', { actorId: 'local-editor' }); await refresh(); notice('Ši puslapio versija patvirtinta.'); }
    else if (action === 'delete-page') { if (confirm('Pašalinti nepatvirtintą puslapio planą ir juodraštį?')) { await send(pageUrl(id), 'DELETE'); state.pageId = null; state.tab = 'pages'; await refresh(); notice('Juodraštis pašalintas.'); } }
    else if (action === 'revoke-page') { if (confirm('Atšaukti patvirtintą šio puslapio versiją kitame eksporte?')) { await send(pageUrl(id, '/revoke'), 'POST'); await refresh(); notice('Puslapis atšauktas kitam eksportui.'); } }
    else if (action === 'export') { const result = await send(siteUrl('/export'), 'POST'); const node = document.querySelector('#export-result'); node.style.display = 'block'; node.textContent = `${result.pages} puslapiai ir ${result.assets} vaizdai: ${result.path}`; notice('Paketas parengtas.'); }
    else if (action === 'add-external-link') { document.querySelector('#external-link-list')?.insertAdjacentHTML('beforeend', externalLinkRow()); }
    else if (action === 'remove-external-link') { button.closest('[data-external-link-row]')?.remove(); }
    else if (action === 'copy-image-prompt') { const prompt = app.querySelector('[name=prompt]').value; await navigator.clipboard.writeText(prompt); notice('ImageGen užduotis nukopijuota.'); }
  } catch (error) { notice(error.message, true); } finally { if (button.isConnected) button.disabled = false; }
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]'); if (!form) return; event.preventDefault();
  const type = form.dataset.form; const submit = form.querySelector('[type=submit]'); if (submit) submit.disabled = true;
  const data = new FormData(form);
  try {
    if (type === 'new-site') { const created = await send('/api/sites', 'POST', Object.fromEntries(data)); await refresh(false); await openSite(created.id); notice('Svetainė pridėta.'); }
    else if (type === 'site') { await send(siteUrl(), 'PUT', { name: data.get('name'), offer: data.get('offer'), audience: data.get('audience'), facts: data.get('facts'), brand: { accent: data.get('accent') } }); await refresh(); notice('Verslo aprašas išsaugotas.'); }
    else if (type === 'contact') { await send(siteUrl(), 'PUT', { contact: { email: data.get('email'), phone: data.get('phone') } }); await refresh(); notice('Kontaktai išsaugoti.'); }
    else if (type === 'page') {
      const v2=state.site.schemaVersion===2;
      const current=state.site.pages.find(p=>p.id===state.pageId);
      const payload = { type: data.get('type'), slug: data.get('slug'), title: data.get('title'), description: data.get('description'), intent: data.get('intent'), cluster: data.get('cluster'), seasonalHook: data.get('seasonalHook'), pillarPageId: data.get('pillarPageId') || null, body: v2?JSON.parse(data.get('body')):parseBody(data.get('body')), ...(v2?{editorial:JSON.parse(data.get('editorial'))}:{}), publishAt: v2&&current&&localInput(current.publishAt)===data.get('publishAt')?current.publishAt:vilniusInputToIso(data.get('publishAt')), factChecks: String(data.get('factChecks') || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean) };
      if (state.pageId) await send(pageUrl(state.pageId), 'PUT', payload);
      else { const created = await send(siteUrl('/pages'), 'POST', payload); state.pageId = created.id; }
      await refresh(); notice('Juodraštis išsaugotas.');
    }
    else if (type === 'attachments') {
      const pageId = state.pageId;
      const media = data.getAll('asset').map(id => state.site.assets.find(asset => asset.id === id)).filter(Boolean).map(({ id, src, alt, width, height, credit, rights }) => ({ id, src, alt, width, height, credit, rights }));
      const links = [...form.querySelectorAll('[data-internal-link-row]')].map(row => {
        const input = row.querySelector('[name="link"]');
        return input.checked ? { targetPageId: input.value, label: row.querySelector('[data-internal-link-label]').value.trim() } : null;
      }).filter(Boolean);
      if (links.some(link => !link.label)) throw new Error('Pažymėtai vidinei nuorodai reikia teksto.');
      const externalLinks = [...form.querySelectorAll('[data-external-link-row]')].map(row => {
        const url = row.querySelector('[data-external-url]').value.trim();
        const label = row.querySelector('[data-external-label]').value.trim();
        const reason = row.querySelector('[data-external-reason]').value.trim();
        if (!url && !label && !reason) return null;
        if (!url.startsWith('https://') || !label || !reason) throw new Error('Išorinei nuorodai reikia HTTPS adreso, teksto ir paaiškinimo.');
        return { url, label, reason, verified: row.querySelector('[data-external-verified]').checked };
      }).filter(Boolean);
      await send(pageUrl(pageId), 'PUT', { media, links, externalLinks }); await refresh(); notice('Vaizdai ir nuorodos išsaugoti.');
    }
    else if (type === 'imagegen') { await send(siteUrl('/images/generate'), 'POST', { prompt: data.get('prompt'), alt: data.get('alt') }); state.tab = 'jobs'; await refresh(); notice('ImageGen užduotis pradėta.'); }
    else if (type === 'upload') {
      const file = data.get('file'); if (!file?.size) throw new Error('Pasirinkite vaizdo failą.');
      if(file.size>12*1024*1024)throw new Error('Vaizdas viršija 12 MB ribą.');
      const bytes = new Uint8Array(await file.arrayBuffer()); let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      const imported=await send(siteUrl('/assets'), 'POST', { base64: btoa(binary), mime: file.type, alt: data.get('alt'), rights: data.get('rights') }); await refresh(); notice(`Vaizdas optimizuotas: ${imported.variants.length} WebP dydžiai. Puslapyje pasirinkite vaizdą vieną kartą.`);
    }
  } catch (error) { notice(error.message, true); } finally { if (submit?.isConnected) submit.disabled = false; }
});

setInterval(async () => {
  if (state.tab !== 'jobs') return;
  try { const jobs = await api('/api/jobs'); if (JSON.stringify(jobs) !== JSON.stringify(state.jobs)) await refresh(); }
  catch { /* Keep the last known state and allow manual refresh. */ }
}, 4000);

try { await refresh(false); const id = decodeURIComponent(location.hash.slice(1)); if (id && state.sites.some(site => site.id === id)) await openSite(id); }
catch (error) { app.innerHTML = `<div class="empty"><strong>Studijos paleisti nepavyko.</strong>${esc(error.message)}</div>`; }

