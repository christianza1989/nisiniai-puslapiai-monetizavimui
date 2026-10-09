// Private planning policy; public packages keep their existing ISO UTC contract.
export function contentPolicy(input = {}, timezone = 'Europe/Vilnius') {
  const policy = { months: 6, articlesPerMonth: 2, articlesPerWeek: 3, localTime: '10:00', timezone, ...input };
  policy.cadence = input.cadence ?? (input.articlesPerWeek !== undefined ? 'weekly' : 'monthly');
  if (!['monthly', 'weekly', 'coverage'].includes(policy.cadence)) throw new Error('Turinio kadencija turi būti monthly, weekly arba coverage.');
  if (policy.cadence === 'coverage' && (!Number.isInteger(policy.topicTarget) || policy.topicTarget < 1 || policy.topicTarget > 500)) throw new Error('Aprėpties tikslas: 1–500 apibrėžtų temų; tai transporto saugos riba, ne publikavimo kvota.');
  if (!Number.isInteger(policy.months) || policy.months < 1 || policy.months > 12) throw new Error('Turinio horizontas: 1–12 mėnesių.');
  if (policy.cadence === 'monthly' && (!Number.isInteger(policy.articlesPerMonth) || policy.articlesPerMonth < 1 || policy.articlesPerMonth > 12)) throw new Error('Turinio dažnis: 1–12 straipsnių per mėnesį.');
  if (policy.cadence === 'weekly' && (!Number.isInteger(policy.articlesPerWeek) || policy.articlesPerWeek < 1 || policy.articlesPerWeek > 7)) throw new Error('Turinio dažnis: 1–7 straipsniai per savaitę.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(policy.localTime)) throw new Error('Publikavimo laikas turi būti HH:mm.');
  new Intl.DateTimeFormat('en', { timeZone: policy.timezone }).format();
  return { months: policy.months, cadence: policy.cadence, ...(policy.cadence === 'coverage' ? { topicTarget: policy.topicTarget } : policy.cadence === 'weekly' ? { articlesPerWeek: policy.articlesPerWeek } : { articlesPerMonth: policy.articlesPerMonth }), localTime: policy.localTime, timezone: policy.timezone };
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
  return { start, end, target: policy.cadence === 'coverage' ? policy.topicTarget : policy.cadence === 'weekly' ? weeklySlots(start, end, policy.articlesPerWeek).length : policy.months * policy.articlesPerMonth };
}
export function scheduledPlan(proposals, pages, policy, now = Date.now()) {
  const window = planningWindow(policy, now);
  const used = new Set(pages.filter(p => p.status !== 'revoked').map(p => localDate(p.publishAt, policy.timezone)));
  const timed = proposals.filter(p => p.type !== 'home'); let index = 0;
  const first = shiftDate(window.start, 7), dates = [];
  for (let date = first; date <= window.end; date = shiftDate(date, 1)) dates.push(date);
  const slots = policy.cadence === 'weekly' ? weeklySlots(window.start, window.end, policy.articlesPerWeek) : [];
  const weekOf = date => Math.floor(dateDifference(date, '1970-01-05') / 7), weekCounts = new Map();
  for (const page of pages.filter(p => ['guide','article'].includes(p.type) && p.status !== 'revoked')) {
    const date = localDate(page.publishAt, policy.timezone);
    if (date >= window.start && date <= window.end) weekCounts.set(weekOf(date), (weekCounts.get(weekOf(date)) || 0) + 1);
  }
  return proposals.map(input => {
    if (input.type === 'home') return { ...input, publishAt: new Date(now).toISOString() };
    if (policy.cadence === 'coverage') {
      let date = input.publishDate;
      try { localPublishAt(date, policy.localTime, policy.timezone); if (date < window.start || date > window.end) date = null; } catch { date = null; }
      const candidate = localPublishAt(date || window.start, policy.localTime, policy.timezone);
      return { ...input, publishAt: new Date(Math.max(Date.parse(candidate), now)).toISOString() };
    }
    index++;
    const weekly = policy.cadence === 'weekly' && ['guide','article'].includes(input.type);
    const available = date => !used.has(date) && (!weekly || (weekCounts.get(weekOf(date)) || 0) < policy.articlesPerWeek);
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
    if (date && used.has(date)) date = dates.find(value => value >= date && available(value)) || dates.find(available);
    if (!date) throw new Error('Plane nebeliko laisvos datos; sumažinkite dažnį arba peržiūrėkite planą.');
    used.add(date);
    if (weekly) weekCounts.set(weekOf(date), (weekCounts.get(weekOf(date)) || 0) + 1);
    return { ...input, publishAt: localPublishAt(date, policy.localTime, policy.timezone) };
  });
}
