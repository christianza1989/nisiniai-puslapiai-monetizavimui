(() => {
 const $=selector=>document.querySelector(selector),id=new URLSearchParams(location.search).get('order');
 const status=$('[data-order-status]');
 if(! /^[a-f0-9]{32}$/.test(id||'')){status.textContent='Open an order from your checkout confirmation. If you need help, contact us.';return;}
 let attempts=0,timer;
 const link=(label,href)=>{const a=document.createElement('a');a.className='button secondary';a.textContent=label;a.href=href;return a;};
 async function load(){
  clearTimeout(timer);
  try{
   const response=await fetch('/api/shop/order?id='+encodeURIComponent(id)),result=await response.json();
   if(!response.ok){if(response.status===401){status.replaceChildren(document.createTextNode('Sign in to view this order. '),link('Sign in','/login?next=checkout&order='+id));return;}throw Error(result.error);}
   const {order,entitlement,delivery,mode}=result,money=amount=>new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency}).format(amount/100);
   status.textContent=(mode==='test'?'TEST ONLY  -  ':'')+(order.status==='paid'?'Payment confirmed.':order.status==='pending'?'Your payment is still being confirmed. This page will check again shortly.':order.status==='refunded'?'This payment has been refunded.':order.status==='disputed'?'This payment is under review.':'Order status: '+order.status+'.');
   const names=['App only','App + 1 holder','App + 2 holders','App + 3 holders'];
   $('[data-order-details]').replaceChildren();
   for(const [label,value]of [['Order',order.id],['Setup',names[order.holders]],['Finish',order.holders?order.finish:'No hardware'],['Delivery status',order.holders?({unfulfilled:'Awaiting dispatch',dispatched:'Dispatched',fulfilled:'Delivered',on_hold:'On hold'}[order.fulfilment]||order.fulfilment):'Digital delivery'],['Setup price',money(order.subtotal)],['Shipping',money(order.shipping)],['Total',money(order.subtotal+order.shipping)]]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);$('[data-order-details]').append(row);}
   if(order.status==='paid'){try{sessionStorage.removeItem('phonebridger.checkout.v1');}catch{}}
   const actions=$('[data-order-actions]');actions.replaceChildren();
   if(order.paid_at)actions.append(link('Download payment summary','/api/shop/receipt?id='+id));
   if(order.status==='paid'&&entitlement?.status==='active')actions.append(link(mode==='test'?'Download test licence record':'Download licence record','/api/shop/licence?id='+id),link('Get the apps','/downloads'));
   const deliveryStatus=$('[data-delivery-status]');deliveryStatus.textContent=mode==='test'?'Sandbox simulation. No money, licence or hardware is supplied.':order.holders?'Your software is available after payment. Hardware tracking appears here after dispatch.':'Your software download and purchase record are ready.';
   if(delivery){deliveryStatus.append(document.createTextNode(' '+delivery.carrier+'  -  '+delivery.tracking_number+' '),link('Track delivery',delivery.tracking_url));}
   $('.pb-order-panel').hidden=false;$('.pb-review-form').hidden=!(order.status==='paid'&&order.fulfilment==='fulfilled');
   if(['creating','pending'].includes(order.status)&&++attempts<12)timer=setTimeout(load,5000);
  }catch(error){status.textContent=error.message||'The order service is temporarily unavailable. Use Refresh order to try again.';$('.pb-order-panel').hidden=false;}
 }
 $('[data-refresh-order]').addEventListener('click',()=>{attempts=0;load();});load();
 $('.pb-review-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const button=form.querySelector('button'),output=$('[data-review-status]');button.disabled=true;try{const data=Object.fromEntries(new FormData(form));data.rating=Number(data.rating);data.consent=form.elements.consent.checked;data.orderId=id;const response=await fetch('/api/shop/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error);output.textContent=result.message;form.reset();}catch(error){output.textContent=error.message;}finally{button.disabled=false;}});
})();
