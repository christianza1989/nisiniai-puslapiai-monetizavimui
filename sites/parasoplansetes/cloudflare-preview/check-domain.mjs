import fs from 'node:fs';

// Read-only launch probe. Normal certificate verification remains enabled.
const reportPath = process.argv[2];
const checks = await Promise.all([
  ['https://parasoplansetes.lt/', 200, null],
  ['https://parasoplansetes.lt/gidai', 200, null],
  ['https://parasoplansetes.lt/robots.txt', 200, null],
  ['https://www.parasoplansetes.lt/gidai?qa=domain', 308, 'https://parasoplansetes.lt/gidai?qa=domain'],
  ['http://parasoplansetes.lt/gidai?qa=domain', 308, 'https://parasoplansetes.lt/gidai?qa=domain'],
].map(async ([url, status, location]) => {
  try {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    const actualLocation = response.headers.get('location');
    const isRobots = url.endsWith('/robots.txt');
    const siteMatches = location || (isRobots ? body.includes('Disallow: /') : body.includes('StepOver') && body.includes('<h1'));
    return { url, status: response.status, location: actualLocation,
      title: body.match(/<title>([^<]*)<\/title>/)?.[1] || null,
      noindex: response.headers.get('x-robots-tag'),
      pass: response.status === status && (!location || actualLocation === location) && Boolean(siteMatches)
        && response.headers.get('x-robots-tag') === 'noindex, nofollow' };
  } catch (error) {
    return { url, pass: false, error: error.cause?.code || error.message };
  }
}));
const report = { checkedAt: new Date().toISOString(), kind: 'custom-domain-live',
  pass: checks.every(check => check.pass), indexingEnabled: false, checks };
if (reportPath) fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
