'use client';
import {useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,ArrowDown,Check} from 'lucide-react';
import type {Product} from '@/lib/types';
import type {ExpandedState} from '@/lib/expanded-configurator';
import type {ResolvedConfigurationArticle} from '@/lib/configuration-article';
import {productBuilderSteps,duoControlExplanation} from '@/lib/duo-builder';
import {studioBuilderSteps,studioStepIntro} from '@/lib/product-studio';
export function DuoBackBuilder({product,state,choices,article,control,actions,details,heading='Susirinkite savo kėdę',studio=false,preview,extraControls}:{preview?:ReactNode;extraControls?:ReactNode;studio?:boolean;heading?:string;product:Product;state:ExpandedState;choices:Record<string,string[]>;article?:ResolvedConfigurationArticle;control:(field:string)=>ReactNode;actions:ReactNode;details:{label:string;value:string}[]}){
 const [step,setStep]=useState(0),title=useRef<HTMLHeadingElement>(null);
 const steps=(studio?studioBuilderSteps(product,choices,!!article):productBuilderSteps(product,choices)),current=Math.min(step,steps.length-1),spec=steps[current],fields=spec.fields;
 function go(index:number){setStep(index);requestAnimationFrame(()=>{title.current?.focus({preventScroll:true});title.current?.scrollIntoView({block:'nearest'});if(studio)document.getElementById('duo-tab-'+steps[index].id)?.scrollIntoView({block:'nearest',inline:'nearest'});});}
 const final=current===steps.length-1;
 const finishCopy=article?.sections.find(s=>s.id==='finishes');
 const summary=product.id.includes('xilium-swivel')?details.filter(d=>['Mechanizmas','Atlošo judėjimas','Galvos atrama','Porankiai','Pagrindas','Ratukai','Konstrukcijos spalva'].includes(d.label)):details;
 const stepActions=<div className="duo-step-actions">{current>0?<button type="button" className="text-link" onClick={()=>go(current-1)}><ArrowLeft size={17}/>Atgal</button>:studio?<button type="button" className="text-link" disabled><ArrowLeft size={17}/>Atgal</button>:<span/>}{!final&&<button type="button" className="button dark" onClick={()=>go(current+1)}>Tęsti<ArrowRight size={18}/></button>}{final&&<span className="duo-choices-ready"><Check size={17}/>Pasirinkimai paruošti užklausai</span>}</div>;
 return <div className={'duo-builder'+(studio?' duo-studio-builder':'')}>
  <div className="duo-builder-heading"><h2>{heading}</h2><span>{current+1} iš {steps.length}</span></div>
  <nav className="duo-step-nav" data-step-count={steps.length} aria-label="Kėdės pasirinkimo žingsniai">{steps.map((s,i)=><button key={s.id} type="button" id={'duo-tab-'+s.id} aria-current={current===i?'step':undefined} aria-label={(i+1)+'. '+s.label} onClick={()=>go(i)}><span className="duo-step-number" aria-hidden="true">{i+1}</span><span>{s.label}</span>{studio&&i<steps.length-1&&<ArrowRight className="duo-step-arrow" size={16} aria-hidden="true"/>}</button>)}</nav>
  <section className={'duo-step-panel duo-step-'+spec.id} id={'duo-panel-'+spec.id} aria-labelledby={'duo-step-title-'+spec.id}>
   {current===0&&extraControls}<h3 className="duo-step-title" id={'duo-step-title-'+spec.id} tabIndex={-1} ref={title}>{spec.title}</h3>{studio&&<p className="studio-step-intro">{studioStepIntro(spec.id,choices)}</p>}
   <div className={'duo-step-controls'+(current>=2?' duo-step-controls-grid':'')}>{fields.map(field=>{const explanation=duoControlExplanation(product,state,field);return <div className="duo-step-choice" key={field}>{control(field)}{studio?explanation.length>0&&<details className="studio-choice-explanation"><summary>Daugiau apie pasirinkimą</summary>{explanation.map((p,i)=><p className="duo-choice-description" key={i}>{p}</p>)}</details>:explanation.map((p,i)=><p className="duo-choice-description" key={i}>{p}</p>)}</div>;})}</div>
   {final&&<>{finishCopy&&<p className="duo-finishes-note">{finishCopy.paragraphs.join(' ')}</p>}<div className="duo-final-summary"><h3>Jūsų kėdės komplektacija</h3><dl>{summary.map(d=><div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl><p className="duo-offer-note">Kaina pagal pasirinktą komplektaciją.</p>{actions}</div></>}
   {studio&&stepActions}
  </section>
  {preview}
  {!studio&&stepActions}
  {(article||studio)&&<a className="text-link duo-read-link" href="#duo-product-description" onClick={event=>{
   const section=document.getElementById('duo-product-description');if(!section)return;
   event.preventDefault();section.scrollIntoView({block:'start'});
   document.getElementById('duo-description-heading')?.focus({preventScroll:true});
   window.history.replaceState(null,'',event.currentTarget.href);
  }}>Aprašymas ir techniniai duomenys<ArrowDown size={17}/></a>}
 </div>;
}
