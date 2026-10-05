// Private planning policy; public packages keep their existing ISO UTC contract.
export function contentPolicy(input = {}, timezone = 'Europe/Vilnius') {
  const policy = { months: 6, articlesPerMonth: 2, localTime: '10:00', timezone, ...input };
  if (!Number.isInteger(policy.months) || policy.months < 1 || policy.months > 12) throw new Error('Turinio horizontas: 1–12 mėnesių.');
  if (!Number.isInteger(policy.articlesPerMonth) || policy.articlesPerMonth < 1 || policy.articlesPerMonth > 12) throw new Error('Turinio dažnis: 1–12 straipsnių per mėnesį.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(policy.localTime)) throw new Error('Publikavimo laikas turi būti HH:mm.');
  new Intl.DateTimeFormat('en', { timeZone: policy.timezone }).format();
  return { months: policy.months, articlesPerMonth: policy.articlesPerMonth, localTime: policy.localTime, timezone: policy.timezone };
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
export function planningWindow(policy, now = Date.now()) {
  const start = localDate(now, policy.timezone), date = new Date(start + 'T12:00:00.000Z');
  const originalDay = date.getUTCDate(); date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + policy.months);
  date.setUTCDate(Math.min(originalDay, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()));
  return { start, end: date.toISOString().slice(0, 10), target: policy.months * policy.articlesPerMonth };
}
export function scheduledPlan(proposals, pages, policy, now = Date.now()) {
  const window = planningWindow(policy, now);
  const used = new Set(pages.map(p => localDate(p.publishAt, policy.timezone)));
  const timed = proposals.filter(p => p.type !== 'home'); let index = 0;
  const first = localDate(now + 7 * 86400000, policy.timezone);
  const dates = [];
  for (let date = first; date <= window.end;) {
    dates.push(date); const next = new Date(date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1); date = next.toISOString().slice(0,10);
  }
  return proposals.map(input => {
    if (input.type === 'home') return { ...input, publishAt: new Date(now).toISOString() };
    index++;
    let date = input.publishDate;
    try {
      const instant = localPublishAt(date, policy.localTime, policy.timezone);
      if (date > window.end || Date.parse(instant) < now + 7 * 86400000) date = null;
    } catch { date = null; }
    if (!date) {
      const span = Date.parse(window.end + 'T12:00:00Z') - now;
      date = localDate(now + Math.max(7 * 86400000, Math.round(span * index / Math.max(1, timed.length))), policy.timezone);
      if (date > window.end) date = window.end;
    }
    if (used.has(date)) date = dates.find(value => value >= date && !used.has(value)) || dates.find(value => !used.has(value));
    if (!date) throw new Error('Plane nebeliko laisvos datos; sumažinkite dažnį arba peržiūrėkite planą.');
    used.add(date);
    return { ...input, publishAt: localPublishAt(date, policy.localTime, policy.timezone) };
  });
}
