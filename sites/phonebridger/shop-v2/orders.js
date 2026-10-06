(() => {
 const output=document.querySelector('[data-orders-status]'),list=document.querySelector('[data-orders-list]');
 const names=['App only','App + 1 holder','App + 2 holders','App + 3 holders'];
 fetch('/api/shop/orders').then(async response=>{
  const result=await response.json();if(!response.ok)throw Error(result.error);
  output.textContent=result.orders.length?'Payment and delivery records for this account.':'No orders yet. Your saved setup is ready when you are.';
  for(const order of result.orders){
   const link=document.createElement('a');link.className='pb-account-order';link.href='/checkout?order='+order.id;
   const title=document.createElement('strong');title.textContent=names[order.holders]+(order.holders?' · '+order.finish:'');
   const detail=document.createElement('span');detail.textContent=new Date(order.created_at).toLocaleDateString()+' · '+order.status+' · '+new Intl.NumberFormat('en-US',{style:'currency',currency:order.currency}).format((order.subtotal+order.shipping)/100);
   link.append(title,detail);list.append(link);
  }
 }).catch(error=>{output.textContent=error.message||'Orders are temporarily unavailable.';});
})();
