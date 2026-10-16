/* Local creator-program demonstration. Integer cents; no billing or external accounts. */
(function(root){
  'use strict';
  const DAY=86400000, TODAY=Date.UTC(2026,9,5);
  const date=ago=>new Date(TODAY-ago*DAY).toISOString().slice(0,10);
  const money=cents=>new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR'}).format(cents/100);
  function seed(){
    const content=[
      {id:'content-1',title:'One mouse. Three phones.',platform:'TikTok',image:'photo-workspace',link:'link-1',campaign:'Your desk, connected',status:'Published',visitors:1440,signups:120},
      {id:'content-2',title:'My everyday desk setup',platform:'YouTube Shorts',image:'photo-studio-detail',link:'link-2',campaign:'Your desk, connected',status:'Published',visitors:600,signups:48},
      {id:'content-3',title:'A calmer way to work',platform:'YouTube',image:'photo-team-table',link:'link-3',campaign:'Creator stories',status:'Published',visitors:360,signups:24}
    ];
    const commissions=Array.from({length:64},(_,i)=>({id:`commission-${i+1}`,order:`PB-${1041+i}`,customer:`Customer ${String(i+1).padStart(3,'0')}`,content:i<40?'content-1':i<56?'content-2':'content-3',base:2500,rate:20,amount:500,reversed:0,status:i<10?'Paid':i<46?'Available':'Pending',date:date(i<10?89-i:i<46?79-(i-10):17-(i-46)),release:date(i<46?0:17-(i-46)-30),payout:i<10?'payout-1':null,terms:'demo-v1',adjustments:[]}));
    commissions.forEach(c=>c.link=content.find(item=>item.id===c.content).link);
    const traffic=content.flatMap(c=>Array.from({length:90},(_,i)=>({date:date(i),content:c.id,link:c.link,visitors:Math.floor(c.visitors/90)+(i<c.visitors%90?1:0),signups:Math.floor(c.signups/90)+(i<c.signups%90?1:0)})));
    return {seq:100,currency:'EUR',profile:{name:'Jamie Parker',handle:'jamie',email:'jamie@example.test',emailUpdates:true,weeklyDigest:true,methodReady:false},terms:{rate:20,reviewDays:30,minimum:5000,model:'One-time sale',attributionDays:30},content,traffic,commissions,
      links:content.map((c,i)=>({id:`link-${i+1}`,name:['TikTok bio','YouTube Shorts','YouTube description'][i],channel:c.platform,content:c.id,code:['tiktok-bio','shorts-desk','youtube-setup'][i],archived:false})),
      payouts:[{id:'payout-1',date:date(8),amount:5000,status:'Paid',commissions:commissions.slice(0,10).map(c=>c.id),reference:'DEMO-2026-09-001'}],
      activity:[{id:'activity-1',title:'Your September payout is complete',text:'€50.00 · Demo bank account',date:date(8)},{id:'activity-2',title:'Your latest video is performing well',text:'One mouse. Three phones. · TikTok',date:date(2)}]};
  }
  const uid=(d,p)=>`${p}-${++d.seq}`;
  const net=c=>Math.max(0,c.amount-c.reversed);
  function rows(d,days=90,content=null){const cutoff=date(days-1);return d.commissions.filter(c=>c.date>=cutoff&&(!content||c.content===content));}
  function summary(d,days=90,content=null,link=null){
    const list=rows(d,days,content).filter(c=>!link||c.link===link),cutoff=date(days-1),traffic=d.traffic.filter(t=>t.date>=cutoff&&(!content||t.content===content)&&(!link||t.link===link));
    const visitors=traffic.reduce((s,t)=>s+t.visitors,0),signups=traffic.reduce((s,t)=>s+t.signups,0);
    const paidCorrection=d.commissions.filter(c=>c.status==='Paid').reduce((s,c)=>s+c.reversed,0)-d.payouts.filter(p=>['Scheduled','Processing','Paid'].includes(p.status)).reduce((s,p)=>s+(p.adjustmentOffset||0),0);
    return {visitors,signups,referrals:list.filter(c=>c.reversed<c.amount).length,sales:list.length,revenue:list.reduce((s,c)=>s+c.base-Math.round(c.reversed*100/c.rate),0),earnings:list.reduce((s,c)=>s+net(c),0),
      available:d.commissions.filter(c=>c.status==='Available').reduce((s,c)=>s+net(c),0)-paidCorrection,
      pending:d.commissions.filter(c=>c.status==='Pending').reduce((s,c)=>s+net(c),0),scheduled:d.payouts.filter(p=>['Scheduled','Processing'].includes(p.status)).reduce((s,p)=>s+p.amount,0),
      paid:d.payouts.filter(p=>p.status==='Paid'&&p.date>=cutoff).reduce((s,p)=>s+p.amount,0),conversion:visitors?list.filter(c=>c.reversed<c.amount).length/visitors*100:0};
  }
  function series(d,days=90,metric='earnings'){
    return Array.from({length:7},(_,i)=>{const from=date(days-1-Math.floor(i*days/7)),to=date(Math.max(0,days-1-Math.floor((i+1)*days/7)+1));
      const sales=d.commissions.filter(c=>c.date>=from&&c.date<=to),traffic=d.traffic.filter(t=>t.date>=from&&t.date<=to);
      return {from,to,value:metric==='visitors'?traffic.reduce((s,t)=>s+t.visitors,0):metric==='sales'?sales.length:sales.reduce((s,c)=>s+net(c),0)};
    });
  }
  function activity(d,title,text){d.activity.unshift({id:uid(d,'activity'),title,text,date:date(0)});d.activity=d.activity.slice(0,30);}
  function linkUrl(d,link){return `https://phonebridger.com/r/${d.profile.handle}${link?'?via='+link.code:''}`;}
  function createLink(d,{name,channel='TikTok',content='content-1'}){
    name=String(name||'').trim().slice(0,60);if(!name)return {error:'Give your tracking link a name.'};
    const id=uid(d,'link'),code=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'creator';
    const link={id,name,channel:String(channel).slice(0,40),content,code:code+'-'+d.seq,archived:false};d.links.push(link);activity(d,'Tracking link created',name);return {link};
  }
  function addContent(d,{title,platform='TikTok',url=''}){
    title=String(title||'').trim().slice(0,100);if(!title)return {error:'Add a title for your content.'};
    if(url&&!/^https:\/\/(www\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com)\//i.test(url))return {error:'Use a TikTok, YouTube or Instagram HTTPS URL, or leave it empty for the demo.'};
    const item={id:uid(d,'content'),title,platform,url:String(url).slice(0,300),image:'photo-workspace',campaign:'Creator stories',status:'Submitted',visitors:0,signups:0};
    const result=createLink(d,{name:title,channel:platform,content:item.id});item.link=result.link.id;d.content.push(item);activity(d,'Content submitted',title);return {content:item};
  }
  function sale(d,content='content-1'){
    if(!d.content.some(c=>c.id===content))return {error:'Choose a content source.'};
    const c={id:uid(d,'commission'),order:`PB-${1100+d.seq}`,customer:`Customer ${65+d.commissions.length-64}`,content,base:2500,rate:d.terms.rate,amount:Math.round(2500*d.terms.rate/100),reversed:0,status:'Pending',date:date(0),release:date(-d.terms.reviewDays),payout:null,terms:'demo-v1',adjustments:[]};
    c.link=d.content.find(item=>item.id===content).link;
    d.commissions.push(c);d.traffic.push({date:date(0),content,link:c.link,visitors:1,signups:1});activity(d,'New referral sale',`${c.order} · ${money(c.amount)} pending`);return {commission:c};
  }
  function approve(d,id){const c=d.commissions.find(c=>c.id===id);if(!c||c.status!=='Pending'||!net(c))return {error:'This commission is not waiting for approval.'};c.status='Available';c.release=date(0);activity(d,'Commission approved',`${c.order} · ${money(net(c))} available`);return {commission:c};}
  function refund(d,id){
    const c=d.commissions.find(c=>c.id===id);if(!c||c.reversed>=c.amount)return {error:'This sale has already been fully refunded.'};
    if(c.status==='Scheduled')return {error:'Cancel the scheduled payout before refunding this sale in the demo.'};
    const amount=c.amount-c.reversed;c.reversed+=amount;c.adjustments.push({id:uid(d,'adjustment'),amount:-amount,date:date(0),reason:'Full demo refund'});if(c.status!=='Paid')c.status='Reversed';activity(d,'Refund adjustment recorded',`${c.order} · −${money(amount)}`);return {commission:c};
  }
  function schedulePayout(d){
    if(!d.profile.methodReady)return {error:'Set up your demo payout method first.'};
    if(d.payouts.some(p=>['Scheduled','Processing'].includes(p.status)))return {error:'A payout is already scheduled. Complete or cancel it first.'};
    const balance=summary(d).available;if(balance<d.terms.minimum)return {error:`The demo minimum is ${money(d.terms.minimum)}. Your available balance is ${money(balance)}.`};
    const eligible=d.commissions.filter(c=>c.status==='Available'&&net(c)>0),gross=eligible.reduce((s,c)=>s+net(c),0),p={id:uid(d,'payout'),date:date(0),amount:balance,adjustmentOffset:gross-balance,status:'Scheduled',commissions:eligible.map(c=>c.id),reference:'DEMO-'+d.seq};
    eligible.forEach(c=>{c.status='Scheduled';c.payout=p.id;});d.payouts.push(p);activity(d,'Demo payout scheduled',`${money(balance)} · ${p.reference}`);return {payout:p};
  }
  function payoutAction(d,id,action){
    const p=d.payouts.find(p=>p.id===id);if(!p||!['Scheduled','Processing'].includes(p.status))return {error:'This payout no longer has an active action.'};
    const members=d.commissions.filter(c=>c.payout===id);
    if(action==='process'){if(p.status!=='Scheduled')return {error:'This payout is already processing.'};p.status='Processing';}
    else if(action==='pay'){p.status='Paid';members.forEach(c=>c.status='Paid');}
    else if(['fail','cancel'].includes(action)){p.status=action==='fail'?'Failed':'Cancelled';members.forEach(c=>{c.status='Available';c.payout=null;});}
    else return {error:'Choose a valid payout action.'};
    activity(d,`Demo payout ${p.status.toLowerCase()}`,`${p.reference} · ${money(p.amount)}`);return {payout:p};
  }
  const csvCell=v=>{const s=String(v);return '"'+(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replace(/"/g,'""')+'"';};
  function csv(d,kind='earnings',days=90){const items=kind==='payouts'?d.payouts:rows(d,days);const records=kind==='payouts'?[['Reference','Date','Amount EUR','Status'],...items.map(p=>[p.reference,p.date,(p.amount/100).toFixed(2),p.status])]:[['Order','Date','Source','Eligible sale EUR','Rate %','Commission EUR','Status'],...items.map(c=>[c.order,c.date,d.content.find(x=>x.id===c.content)?.title||'Content',(c.base/100).toFixed(2),c.rate,(net(c)/100).toFixed(2),c.status])];return records.map(row=>row.map(csvCell).join(',')).join('\r\n');}
  const api={seed,date,money,net,rows,summary,series,linkUrl,createLink,addContent,sale,approve,refund,schedulePayout,payoutAction,csv};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.PhoneBridgerCreatorModel=api;
})(typeof window!=='undefined'?window:globalThis);
