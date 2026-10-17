import fs from 'node:fs';
import postcss from 'postcss';

// One-off source migration; don't regenerate or change approved image assets.
const markupPath='src/lib/approved-home-markup.ts';
const markup=fs.readFileSync(markupPath,'utf8');
const match=markup.match(/export const approvedHeroMarkup = (.+);/);
const hero=JSON.parse(match[1]);
const withoutHeader=hero.replace(/\r?\n    <header class="hp-site-header">[\s\S]*?<\/header>\r?\n/,'\r\n');
if(withoutHeader===hero)throw new Error('Expected exactly one embedded homepage header');
fs.writeFileSync(markupPath,markup.replace(match[0],'export const approvedHeroMarkup = '+JSON.stringify(withoutHeader)+';'));
const layoutPath='src/app/layout.tsx';
const layout=fs.readFileSync(layoutPath,'utf8');
fs.writeFileSync(layoutPath,layout.replace('<SiteHeader/><main','<div className="site-shell"><SiteHeader/><main').replace('</main><SiteFooter/>','</main></div><SiteFooter/>'));
for(const [file,pattern] of [
  ['src/app/homepage-approved.css',/\.hp-(?:site-header|wordmark|navigation|header-actions|search-field)\b/],
  ['src/app/site-theme.css',/\.(?:site-header--unified|header-inner|header-search|header-actions|header-quote(?:-label|-count)?|mobile-toggle|mobile-nav)\b/],
]){
  const sheet=postcss.parse(fs.readFileSync(file,'utf8'));
  sheet.walkRules(rule=>{const selectors=rule.selectors.filter(selector=>!pattern.test(selector));if(selectors.length)rule.selectors=selectors;else rule.remove();});
  sheet.walkAtRules(rule=>{if(rule.nodes&&!rule.nodes.length)rule.remove();});
  fs.writeFileSync(file,sheet.toString());
}
console.log('Shared homepage header extracted; approved asset bytes untouched.');
