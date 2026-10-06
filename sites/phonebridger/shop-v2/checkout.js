(() => {
 const $=selector=>document.querySelector(selector),id=new URLSearchParams(location.search).get('order');
 const status=$('[data-order-status]');
 if(! /^[a-f0-9]{32}$/.test(id||'')){status.textContent='Open an order from your checkout confirmation. If you need help, contact us.';return;}
 fetch('/api/shop/order?id='+encodeURIComponent(id)).then(async response=>{
  const result=await response.json();if(!response.ok)throw Error(result.error);const order=result.order;
  status.textContent=order.status==='paid'?'Payment confirmed.':order.status==='pending'?'Your payment is still being confirmed. Check back here shortly.':order.status==='refunded'?'This payment has been refunded.':order.status==='disputed'?'This payment is under review.':'Order status: '+order.status+'.';
  const names=['App only','App + 1 holder','App + 2 holders','App + 3 holders'];
  for(const [label,value]of [['Order',order.id],['Setup',names[order.holders]],['Finish',order.holders?order.finish:'No hardware'],['Fulfilment',order.fulfilment],['Setup price',new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency}).format(order.subtotal/100)]]){const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);$('[data-order-details]').append(row);}
  $('.pb-order-panel').hidden=false;if(order.status==='paid'&&order.fulfilment==='fulfilled')$('.pb-review-form').hidden=false;
 }).catch(error=>{status.textContent=error.message||'The order service is temporarily unavailable.';});
 $('.pb-review-form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;const button=form.querySelector('button'),output=$('[data-review-status]');button.disabled=true;try{const data=Object.fromEntries(new FormData(form));data.rating=Number(data.rating);data.consent=form.elements.consent.checked;data.orderId=id;const response=await fetch('/api/shop/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw Error(result.error);output.textContent=result.message;form.reset();}catch(error){output.textContent=error.message;}finally{button.disabled=false;}});
})();
