import {test} from 'node:test';
import assert from 'node:assert/strict';
import React,{act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {parseHTML} from 'linkedom';
import {ProductGallery,galleryImages} from '../src/components/product-gallery';
const photos=Array.from({length:17},(_,n)=>`/media/products-v2/${String(n+1).padStart(20,'0')}-1600x1600/800.webp`);
test('The complete manufacturer gallery is rendered without the former twelve-image cap',()=>{
 const html=renderToStaticMarkup(<ProductGallery primary={photos[0]} images={photos} name="Hola" specificCount={3}/>),d=parseHTML(html).document;
 assert.equal(d.querySelectorAll('.gallery-thumbs button').length,17);assert.equal(d.querySelectorAll('.gallery-thumbs img[loading="lazy"]').length,17);
 assert.equal(d.querySelector('.gallery-main img')!.getAttribute('src'),photos[0]);assert.deepEqual(galleryImages(photos[0],[photos[0],photos[1],photos[1]]),photos.slice(0,2));
});
test('Thumbnails, arrows and keyboard change the photograph without changing model selection',async()=>{
 const {window}=parseHTML('<html><body><div id="root"></div></body></html>');
 Object.assign(globalThis,{window,document:window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const {createRoot}=await import('react-dom/client');const root=createRoot(window.document.getElementById('root')!);
 const props={primary:photos[0],images:photos,name:'Xilium MESH',specificCount:3};
 await act(async()=>{root.render(<ProductGallery {...props}/>);});
 const source=()=>window.document.querySelector('.gallery-main img')!.getAttribute('src');
 await act(async()=>{window.document.querySelectorAll('.gallery-thumbs button')[4].dispatchEvent(new window.Event('click',{bubbles:true}));});
 assert.equal(source(),photos[4]);assert(window.document.querySelector('.visualization-note')!.textContent!.includes('linijos galerija'));
 await act(async()=>{window.document.querySelector('[aria-label="Kita nuotrauka"]')!.dispatchEvent(new window.Event('click',{bubbles:true}));});assert.equal(source(),photos[5]);
 const event=new window.Event('keydown',{bubbles:true});Object.defineProperty(event,'key',{value:'ArrowLeft'});
 await act(async()=>{window.document.querySelector('.product-photo-gallery')!.dispatchEvent(event);});assert.equal(source(),photos[4]);
 assert.equal(props.primary,photos[0]);assert.equal(props.name,'Xilium MESH');
 await act(async()=>{root.unmount();});delete (globalThis as any).window;delete (globalThis as any).document;delete (globalThis as any).IS_REACT_ACT_ENVIRONMENT;
});
