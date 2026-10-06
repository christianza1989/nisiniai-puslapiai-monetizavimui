// Private planning policy; public packages keep their existing ISO UTC contract.
export function contentPolicy(input = {}, timezone = 'Europe/Vilnius') {
  const policy = { months: 6, articlesPerMonth: 2, articlesPerWeek: 3, coverageTarget: null, preparationDays: 0, localTime: '10:00', timezone, ...input };
  policy.cadence = input.cadence ?? (input.articlesPerWeek !== undefined ? 'weekly' : input.articlesPerMonth !== undefined ? 'monthly' : 'coverage');
  if (!['coverage', 'monthly', 'weekly'].includes(policy.cadence)) throw new Error('Turinio režimas turi būti coverage, monthly arba weekly.');
  if (!Number.isInteger(policy.months) || policy.months < 1 || policy.months > 12) throw new Error('Turinio horizontas: 1–12 mėnesių.');
  if (policy.cadence === 'monthly' && (!Number.isSafeInteger(policy.articlesPerMonth) || policy.articlesPerMonth < 1)) throw new Error('Turinio dažnis turi būti teigiamas sveikas skaičius.');
  if (policy.cadence === 'weekly' && (!Number.isSafeInteger(policy.articlesPerWeek) || policy.articlesPerWeek < 1)) throw new Error('Turinio dažnis turi būti teigiamas sveikas skaičius.');
  if (policy.cadence === 'coverage' && policy.coverageTarget !== null && (!Number.isSafeInteger(policy.coverageTarget) || policy.coverageTarget < 1)) throw new Error('Aprėpties tikslas turi būti pilno temų žemėlapio teigiamas URL skaičius arba null, kol žemėlapio nėra.');
  if (!Number.isSafeInteger(policy.preparationDays) || policy.preparationDays < 0) throw new Error('Pasiruošimo dienos turi būti neneigiamas sveikas skaičius.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(policy.localTime)) throw new Error('Publikavimo laikas turi būti HH:mm.');
  new Intl.DateTimeFormat('en', { timeZone: policy.timezone }).format();
  return { months: policy.months, cadence: policy.cadence, ...(policy.cadence === 'coverage' ? { coverageTarget: policy.coverageTarget, preparationDays: policy.preparationDays } : policy.cadence === 'weekly' ? { articlesPerWeek: policy.articlesPerWeek } : { articlesPerMonth: policy.articlesPerMonth }), localTime: policy.localTime, timezone: policy.timezone };
}
export function localDate(instant, timezone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
const wallParts = (instant, timezone) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant)).map(p => [p.type, p.value]));
export function localPublishAt(date, time, timezone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Neteisinga vietinė data arba laikas.');
  const desired = `${date}T${time}`, nominal = Date.parse(desired + ':00.000Z');
  if (!Number.isFinite(nominal) || new Date(nominal).toISOString().slice(0, 16) !== desired) throw new Error('Neteisinga kalendoriaus data.');
  let guess = nominal;
  for (let i = 0; i < 4; i++) {
    const p = wallParts(guess, timezone);
    const actual = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00.000Z`);
    guess += nominal - actual;
  }
  const matches = value => { const p = wallParts(value, timezone); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === desired; };
  if (!matches(guess)) throw new Error('Šis vietinis laikas neegzistuoja dėl laikrodžio persukimo.');
  // Cover 30-minute and full-hour DST transitions without picking a silent offset.
  if ([-120,-90,-60,-30,30,60,90,120].some(minutes => matches(guess + minutes * 60000))) throw new Error('Šis vietinis laikas dviprasmis dėl laikrodžio persukimo; pasirinkite kitą laiką.');
  return new Date(guess).toISOString();
}
const shiftDate = (date, days) => new Date(Date.parse(date + 'T12:00:00Z') + days * 86400000).toISOString().slice(0,10);
const dateDifference = (a, b) => Math.round((Date.parse(a + 'T12:00:00Z') - Date.parse(b + 'T12:00:00Z')) / 86400000);
function weeklySlots(start, end, count) {
  const slots = [];
  // The editorial preparation window leaves the first seven calendar days free.
  for (let week = shiftDate(start, 7); week <= end; week = shiftDate(week, 7)) {
    for (let i = 0; i < count; i++) {
      const date = shiftDate(week, Math.floor(7 * i / count));
      if (date <= end) slots.push(date);
    }
  }
  return slots;
}
export function planningWindow(policy, now = Date.now()) {
  const start = localDate(now, policy.timezone), date = new Date(start + 'T12:00:00.000Z');
  const originalDay = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + policy.months);
  date.setUTCDate(Math.min(originalDay, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  const end = date.toISOString().slice(0,10);
  return { start, end, target: policy.cadence === 'coverage' ? policy.coverageTarget : policy.cadence === 'weekly' ? weeklySlots(start, end, policy.articlesPerWeek).length : policy.months * policy.articlesPerMonth };
}
export function scheduledPlan(proposals, pages, policy, now = Date.now()) {
  const window = planningWindow(policy, now);
  // A complete topic map sets tentative dates; evidence/review/approval/release still gate publication.
  // Same-day cluster releases are allowed. Existing pages and approved dates are never mutated.
  if (policy.cadence === 'coverage') {
    let first = shiftDate(window.start, policy.preparationDays);
    if (Date.parse(localPublishAt(first, policy.localTime, policy.timezone)) <= now) first = shiftDate(first, 1);
    if (first > window.end) throw new Error('Pasiruošimas netelpa į planavimo horizontą.');
    const planned = proposals.map(input => {
      if (input.type === 'home') return { ...input, publishAt: new Date(now).toISOString() };
      let date = input.publishDate || first;
      localPublishAt(date, policy.localTime, policy.timezone);
      if (date < first) date = first;
      if (date > window.end) throw new Error('Temos data už planavimo horizonto; keiskite planą, neperkelkite sezono tyliai.');
      return { ...input, publishAt: localPublishAt(date, policy.localTime, policy.timezone) };
    });
    const all = [...pages.filter(p => p.status !== 'revoked'), ...planned], resolved = new Set(), visiting = new Set();
    function resolve(page) {
      if (resolved.has(page)) return;
      if (visiting.has(page)) throw new Error('Temų plane ciklinė pagrindinio gido priklausomybė.');
      visiting.add(page);
      const parent = page.pillarSlug ? all.find(p => p.slug === page.pillarSlug && p !== page)
        : page.pillarPageId ? all.find(p => p.id === page.pillarPageId && p !== page)
        : all.slice(0, all.indexOf(page)).find(p => page.cluster && p.cluster === page.cluster && p.type !== 'home');
      if (parent) {
        if (planned.includes(parent)) resolve(parent);
        if (Date.parse(parent.publishAt) > Date.parse(page.publishAt)) page.publishAt = parent.publishAt;
        if (localDate(page.publishAt,policy.timezone) > window.end) throw new Error('Pagrindinio gido priklausomybė už planavimo horizonto.');
      }
      visiting.delete(page); resolved.add(page);
    }
    for (const page of planned.filter(p => p.type !== 'home')) resolve(page);
    return planned;
  }
  const used = new Set(pages.filter(p => p.status !== 'revoked').map(p => localDate(p.publishAt, policy.timezone)));
  const timed = proposals.filter(p => p.type !== 'home'); let index = 0;
  const first = shiftDate(window.start, 7), dates = [];
  for (let date = first; date <= window.end; date = shiftDate(date, 1)) dates.push(date);
  const slots = policy.cadence === 'weekly' ? weeklySlots(window.start, window.end, policy.articlesPerWeek) : [];
  const weekOf = date => Math.floor(dateDifference(date, '1970-01-05') / 7), weekCounts = new Map(), dayCounts = new Map();
  for (const page of pages.filter(p => ['guide','article'].includes(p.type) && p.status !== 'revoked')) {
    const date = localDate(page.publishAt, policy.timezone);
    dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
    if (date >= window.start && date <= window.end) weekCounts.set(weekOf(date), (weekCounts.get(weekOf(date)) || 0) + 1);
  }
  return proposals.map(input => {
    if (input.type === 'home') return { ...input, publishAt: new Date(now).toISOString() };
    index++;
    const weekly = policy.cadence === 'weekly' && ['guide','article'].includes(input.type);
    const multi = weekly && policy.articlesPerWeek > 7 || !weekly && window.target > dates.length;
    const available = date => (multi || !used.has(date)) && (!weekly || ((weekCounts.get(weekOf(date)) || 0) < policy.articlesPerWeek && (dayCounts.get(date) || 0) < Math.ceil(policy.articlesPerWeek / 7)));
    let date = input.publishDate;
    try {
      localPublishAt(date, policy.localTime, policy.timezone);
      if (date > window.end || date < first || (weekly && !available(date))) date = null;
    } catch { date = null; }
    if (!date && weekly) date = slots.find(available) || dates.find(available);
    if (!date && !weekly) {
      const span = Date.parse(window.end + 'T12:00:00Z') - now;
      date = localDate(now + Math.max(7 * 86400000, Math.round(span * index / Math.max(1, timed.length))), policy.timezone);
      if (date > window.end) date = window.end;
    }
    if (date && !available(date)) date = dates.find(value => value >= date && available(value)) || dates.find(available);
    if (!date) throw new Error('Plane nebeliko laisvos datos; sumažinkite dažnį arba peržiūrėkite planą.');
    used.add(date);
    dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
    if (weekly) weekCounts.set(weekOf(date), (weekCounts.get(weekOf(date)) || 0) + 1);
    return { ...input, publishAt: localPublishAt(date, policy.localTime, policy.timezone) };
  });
}
