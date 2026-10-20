'use client';

// editorial-copy-wired
import {copyText} from '@/lib/editorial-copy';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';

export function ApprovedHomeContact(){
  const started=useRef(0),submissionKey=useRef(''),request=useRef<AbortController|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
  useEffect(()=>{started.current=Date.now();submissionKey.current=crypto.randomUUID();return ()=>request.current?.abort();},[]);
  return <section className="hp-contact-section" id="kontaktai" aria-labelledby="contact-title">
    <div className="hp-contact-intro"><h2 id="contact-title">{copyText("ui.e445c4675f1b93d7856b","PAPASAKOKITE APIE SAVO ERDVĘ")}</h2><p>{copyText("ui.565db2af50282974d2ef","Užpildykite formą ir mes su jumis susisieksime.")}</p></div>
    <img className="hp-contact-plant" src="/media/home-final/assets/contact/plant-clean.png" width={1024} height={1536} alt="" aria-hidden="true" loading="lazy" decoding="async"/>
    <svg className="hp-contact-handwriting hp-contact-conversation" viewBox="0 0 142 147" aria-hidden="true" focusable="false"><g transform="rotate(-8 71 73.5)"><text x="0" y="26"><tspan x="0">{copyText("ui.df1bd753e2f1b0e53544","Geresnės")}</tspan><tspan x="0" dy="31.35">{copyText("ui.430c1581fcfb7039cc49","darbo erdvės")}</tspan><tspan x="0" dy="31.35">{copyText("ui.22467ee58f9c201e2ec2","prasideda")}</tspan><tspan x="0" dy="31.35">{copyText("ui.0bf48f9be01622115db9","nuo pokalbio")}</tspan></text><path d="M0 146h32" transform="rotate(8 16 146)"/></g></svg>
    <form className="hp-contact-form" aria-labelledby="contact-title" onSubmit={async event=>{
      event.preventDefault();if(busy||saved)return;
      const fields=new FormData(event.currentTarget);setBusy(true);setError('');request.current=new AbortController();
      try{
        const response=await fetch('/api/quotes/',{method:'POST',headers:{'Content-Type':'application/json'},signal:request.current.signal,body:JSON.stringify({name:fields.get('name'),company:fields.get('company'),email:fields.get('email'),phone:'',message:fields.get('message'),items:[],consent:fields.get('consent')==='on',website:fields.get('website')||'',startedAt:started.current,submissionKey:submissionKey.current})});
        const result=await response.json();
        if(!response.ok||typeof result.id!=='string')throw new Error(result.error||copyText("ui.eea36ed4474b232f0d3d","Nepavyko išsaugoti užklausos. Bandykite dar kartą."));
        setSaved(result.id);
      }catch(caught){if(caught instanceof Error&&caught.name==='AbortError')return;setError(caught instanceof Error?caught.message:copyText("ui.eea36ed4474b232f0d3d","Nepavyko išsaugoti užklausos. Bandykite dar kartą."));}finally{setBusy(false);}
    }}>
      <div className="hp-contact-name-row">
        <label className="hp-contact-field"><span className="hp-sr-only">{copyText("ui.62b064b19508ed966ab1","Vardas (privalomas)")}</span><input name="name" placeholder={copyText("ui.3fdff00284e66b973d15","Vardas")} autoComplete="name" minLength={2} maxLength={100} required/></label>
        <label className="hp-contact-field"><span className="hp-sr-only">{copyText("ui.60c39dde4162fc935263","Įmonė")}</span><input name="company" placeholder={copyText("ui.60c39dde4162fc935263","Įmonė")} autoComplete="organization" maxLength={160}/></label>
      </div>
      <label className="hp-contact-field"><span className="hp-sr-only">{copyText("ui.9beb82822b83bd156b70","El. paštas (privalomas)")}</span><input type="email" name="email" placeholder={copyText("ui.695202bd1818c3a90a29","El. paštas")} autoComplete="email" maxLength={200} required/></label>
      <label className="hp-contact-field"><span className="hp-sr-only">{copyText("ui.77f537d8cdabfe506a63","Žinutė (privaloma)")}</span><textarea name="message" placeholder={copyText("ui.5569ba5bfe70a1229dd8","Žinutė")} rows={4} minLength={10} maxLength={5000} required/></label>
      <div className="honeypot" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" aria-label={copyText("ui.ec03604462764417e41c","Interneto svetainė")}/></div>
      <label className="hp-home-consent"><input type="checkbox" name="consent" required/><span>{copyText("ui.914b782b171d160cea74","Susipažinau su ")}<Link href="/privatumas/">{copyText("ui.8bdcdc3e42cabe921e01","privatumo informacija")}</Link> {copyText("ui.0f3b23d557d74b4c9564","ir sutinku, kad susisiektumėte dėl užklausos.")}</span></label>
      <button className="hp-contact-submit" type="submit" disabled={busy||Boolean(saved)}><span className="hp-submit-label">{busy?copyText("ui.afcc08464f50bcae5b17","Siunčiama…"):saved?copyText("ui.7124f3c22e55d751faca","Užklausa išsaugota"):copyText("ui.1206958e46faa88ab0d6","siųsti užklausą")}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
      {error&&<p className="hp-contact-status" role="alert">{error}</p>}
      {saved&&<p className="hp-contact-status" role="status">{copyText("ui.e029666104a564f964c6","Užklausa išsaugota. Užklausos numeris: ")}{saved.slice(0,8)}.</p>}
      <noscript><p className="hp-contact-status">{copyText("ui.a7b48655a32a35c9dee3","Norėdami pateikti užklausą, susisiekite el. paštu ")}<a href="mailto:info@ergonomic.lt">info@ergonomic.lt</a>.</p></noscript>
    </form>
  </section>;
}
