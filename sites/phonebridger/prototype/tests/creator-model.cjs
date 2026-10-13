const {test}=require('node:test'),assert=require('node:assert/strict');
const M=require('../assets/simulator-v2/creator-model.js');
test('creator seed totals reconcile across cards, sources, orders and graph buckets',()=>{
  const d=M.seed(),s=M.summary(d);
  assert.deepEqual([s.visitors,s.signups,s.referrals,s.revenue,s.earnings,s.available,s.pending,s.paid],[2400,192,64,160000,32000,18000,9000,5000]);
  assert.deepEqual(d.content.map(c=>M.summary(d,90,c.id).referrals),[40,16,8]);
  for(const days of [7,30,90])for(const metric of ['visitors','sales','earnings']){
    const points=M.series(d,days,metric),selected=M.summary(d,days);
    assert.equal(points.reduce((sum,p)=>sum+p.value,0),selected[metric]);
    assert.equal(points[0].from,M.date(days-1));assert.equal(points.at(-1).to,M.date(0));
  }
  const fresh=M.seed();d.commissions[0].amount=1;assert.equal(fresh.commissions[0].amount,500);
});
test('new content has isolated tracking, and unrelated links do not inherit another source results',()=>{
  const d=M.seed(),l=M.createLink(d,{name:'New TikTok link'}).link;
  assert.equal(M.summary(d,90,null,l.id).referrals,0);
  assert.equal(M.summary(d,90,null,'link-1').referrals,40);
  const post=M.addContent(d,{title:'My fresh setup',platform:'YouTube',url:'https://youtu.be/demo'}).content;
  const sale=M.sale(d,post.id).commission;
  assert.equal(M.summary(d,90,post.id).referrals,1);
  assert.equal(M.summary(d,90,null,post.link).referrals,1);
  assert.equal(sale.release,M.date(-30));assert.equal(sale.status,'Pending');
  assert.ok(M.addContent(d,{title:'Unsafe',url:'https://youtube.com.evil.test/x'}).error);
  assert.ok(M.addContent(d,{title:'Unsafe',url:'javascript:alert(1)'}).error);
});
test('approval is single-use and refunds retain a correction without inflating balances',()=>{
  const d=M.seed(),id='commission-47';
  M.approve(d,id);assert.equal(M.summary(d).available,18500);assert.equal(M.summary(d).pending,8500);
  assert.ok(M.approve(d,id).error);
  M.refund(d,id);const c=d.commissions.find(c=>c.id===id);
  assert.equal(c.status,'Reversed');assert.equal(c.adjustments.length,1);
  assert.equal(M.summary(d).available,18000);assert.equal(M.summary(d).earnings,31500);
  assert.ok(M.refund(d,id).error);assert.equal(c.adjustments.length,1);
});
test('payouts reserve exactly once, restore on failure, and settle without duplicate payment',()=>{
  const d=M.seed();assert.ok(M.schedulePayout(d).error);d.profile.methodReady=true;
  const p=M.schedulePayout(d).payout;assert.equal(p.amount,18000);
  assert.equal(M.summary(d).available,0);assert.equal(M.summary(d).scheduled,18000);
  assert.ok(M.schedulePayout(d).error);assert.ok(M.refund(d,p.commissions[0]).error);
  M.payoutAction(d,p.id,'fail');assert.equal(M.summary(d).available,18000);
  assert.ok(M.payoutAction(d,p.id,'pay').error);
  const retry=M.schedulePayout(d).payout;M.payoutAction(d,retry.id,'process');assert.equal(retry.status,'Processing');assert.ok(M.payoutAction(d,retry.id,'process').error);M.payoutAction(d,retry.id,'pay');
  assert.equal(M.summary(d).available,0);assert.equal(M.summary(d).paid,23000);
  assert.equal(M.summary(d).scheduled,0);assert.ok(M.payoutAction(d,retry.id,'pay').error);
});
test('paid refund corrections are deducted once, including cancelled and retried payout offsets',()=>{
  const d=M.seed();d.profile.methodReady=true;M.refund(d,'commission-1');
  assert.equal(M.summary(d).paid,5000);assert.equal(M.summary(d).available,17500);
  const p=M.schedulePayout(d).payout;assert.equal(p.amount,17500);assert.equal(p.adjustmentOffset,500);
  assert.equal(M.summary(d).available,0);M.payoutAction(d,p.id,'cancel');
  assert.equal(M.summary(d).available,17500);
  const retry=M.schedulePayout(d).payout;M.payoutAction(d,retry.id,'pay');
  assert.equal(M.summary(d).available,0);assert.equal(M.summary(d).paid,22500);
  M.approve(d,'commission-47');assert.equal(M.summary(d).available,500);
  M.refund(d,'commission-11');assert.equal(M.summary(d).available,0);
});
test('program versions retain the original rate and CSV exports neutralize spreadsheet formulas',()=>{
  const d=M.seed();d.terms.rate=30;M.sale(d);assert.equal(d.commissions[0].rate,20);assert.equal(d.commissions.at(-1).amount,750);
  d.content[0].title='=HYPERLINK("https://example.test")';const csv=M.csv(d);
  assert.ok(csv.includes('"\'=HYPERLINK('));assert.equal(csv.split('\r\n').length,66);
  d.profile.methodReady=true;d.commissions.filter(c=>c.status==='Available').forEach(c=>c.status='Pending');
  assert.ok(M.schedulePayout(d).error);
});
