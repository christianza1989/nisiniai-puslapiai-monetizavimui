(() => {
  const $=selector=>document.querySelector(selector), $$=selector=>[...document.querySelectorAll(selector)];
  const status=$('[data-setup-status]'),stage=$('.pb-stage'),cta=$('[data-main-cta]');
  const names=['App only','App + 1 holder','App + 2 holders','App + 3 holders'];
  let catalog=null,view='setup',requestId=null,requestSelection=null,pending=false;
  try{const retry=JSON.parse(sessionStorage.getItem('phonebridger.checkout.v1'));requestId=retry?.id;requestSelection=retry?.selection;}catch{}
  const params=new URLSearchParams(location.search);
  let saved=null;try{saved=JSON.parse(localStorage.getItem('phonebridger.setup.v1'));}catch{}
  const desiredCount=params.get('holders')??String(saved?.holders??saved?.count??2),desiredFinish=params.get('finish')??saved?.finish??'black';
  if(/^[0-3]$/.test(desiredCount))$(`input[name=setup][value="${desiredCount}"]`).checked=true;
  if(['black','silver'].includes(desiredFinish))$(`input[name=finish][value="${desiredFinish}"]`).checked=true;
  const choice=()=>({count:Number($('input[name=setup]:checked').value),finish:$('input[name=finish]:checked').value});
  const saveChoice=()=>{const {count,finish}=choice();localStorage.setItem('phonebridger.setup.v1',JSON.stringify({holders:count,finish}));};
  const money=amount=>new Intl.NumberFormat('en-US',{style:'currency',currency:catalog?.currency||'USD',maximumFractionDigits:amount%100?2:0}).format(amount/100);
  function render(){
    const {count,finish}=choice(),finishName=finish==='silver'?'Silver':'Black',offer=catalog?.offers?.find(o=>o.holders===count),amount=offer?.amount??[2900,4900,6500,7900][count],available=offer?.available===true&&(!count||offer.finishes?.[finish]!==false);
    stage.dataset.count=count;stage.dataset.view=view;
    $$('.pb-holder-group img').forEach((img,index)=>{img.hidden=index>=Math.max(count,view==='holder'?1:0);img.src=`/assets/closing-conversion-v1/holder-${finish}-640.webp`;});
    $('.pb-holder-group').setAttribute('aria-label',`${view==='holder'?1:count} ${finish} magnetic holder illustrations`);
    $('[data-thumb-holder]').src=$('[data-detail-holder]').src=`/assets/closing-conversion-v1/holder-${finish}-640.webp`;
    $('[data-detail-holder]').alt=`Open ${finish} foldable magnetic holder illustration`;
    $('.pb-finishes').disabled=count===0;
    $('[data-finish-note]').textContent=count?'Same finish for every holder in your setup.':'App only uses your existing stand. No holder finish is needed.';
    $('[data-holder-inclusion]').textContent=count?`${count} magnetic ${count===1?'holder':'holders'}`:'Optional hardware';
    $('[data-finish-summary]').textContent=count?finishName:'Not included';
    $('[data-selection-name]').textContent=names[count]+(count?' · '+finishName:'');
    $('[data-total]').textContent=money(amount);
    $('[data-mobile-name]').textContent=names[count];$('[data-mobile-price]').textContent=(available?'':'Planned · ')+money(amount)+' '+(catalog?.currency||'usd').toUpperCase();
    $('[data-price-label]').textContent=(available?'Setup price':'Planned launch price')+' · '+(catalog?.currency||'usd').toUpperCase();
    $('[data-availability]').textContent=available?(catalog.mode==='test'?'Test checkout · No real payment':'Orders open'):catalog?.mode!=='disabled'&&offer?.available?'Selected finish unavailable - try the other finish':'Preparing for launch · Try the free beta today';
    $('[data-purchase-note]').textContent=available?'Your final total and any confirmed delivery charge are shown on Stripe Checkout before payment.':'Orders are not open yet. Delivery, applicable taxes and final purchase terms will be confirmed before sales begin.';
    $('.pb-consent').hidden=!available;
    if(catalog?.mode==='test'){const input=$('[data-purchase-consent]');$('.pb-consent').replaceChildren(input,document.createTextNode(' I understand this is a sandbox simulation. No money, goods or licence will be supplied.'));}
    cta.firstChild.textContent=available?(catalog.mode==='test'?'Open test checkout ':'Continue to checkout '):'Ask about this setup ';
    cta.href='/contact?topic=setup&holders='+count+'&finish='+finish;
    $('[data-gallery-tag]').textContent=view==='holder'?finishName+' holder':view==='placement'?'Your screen edges':'Your setup';
    $('[data-gallery-title]').textContent=view==='holder'?'A home for your phone.':view==='placement'?'Put your phone where it belongs.':'One app. Your kind of desk.';
    $('[data-gallery-caption]').textContent=view==='holder'?'Foldable magnetic holder illustration. Final mounting details will be confirmed before sale.':view==='placement'?'Choose Left, Above or Right in the app to match your physical phone position.':'Software is a digital download. Box and holders shown as illustrations.';
    $('.pb-edge-diagram').hidden=view!=='placement';
    $$('[data-view-button]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.viewButton===view)));
  }
  $$('input[name=setup],input[name=finish]').forEach(input=>input.addEventListener('change',()=>{
    requestId=null;status.textContent='';render();const selected=choice();const url=new URL(location.href);url.searchParams.set('holders',selected.count);url.searchParams.set('finish',selected.finish);history.replaceState(null,'',url);
  }));
  $$('[data-view-button]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.viewButton;render();}));
  $('[data-save-setup]').addEventListener('click',()=>{try{saveChoice();status.textContent='Your setup is saved in this browser.';}catch{status.textContent='This browser could not save the choice. You can bookmark this setup instead.';}});
  cta.addEventListener('click',async event=>{
    const {count,finish}=choice(),offer=catalog?.offers.find(o=>o.holders===count),available=offer?.available&&(!count||offer.finishes?.[finish]!==false);
    if(!available)return;event.preventDefault();if(pending)return;
    if(!$('[data-purchase-consent]').checked){status.textContent=catalog.mode==='test'?'Confirm that you understand this is a test.':'Please read and accept the purchase terms before continuing.';$('[data-purchase-consent]').focus();return;}
    const selection=count+':'+finish;if(!requestId||requestSelection!==selection){requestId=crypto.randomUUID();requestSelection=selection;try{sessionStorage.setItem('phonebridger.checkout.v1',JSON.stringify({id:requestId,selection}));}catch{}}
    pending=true;cta.setAttribute('aria-disabled','true');status.textContent='Opening secure checkout…';
    try{
      const response=await fetch('/api/shop/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({holders:count,finish,requestId,consent:true})});const result=await response.json();
      if(response.status===401){try{saveChoice();}catch{}status.textContent='Sign in, then return to your saved setup.';location.href='/login?next=shop';return;}
      if(!response.ok){if(response.status===409){requestId=null;try{sessionStorage.removeItem('phonebridger.checkout.v1');}catch{}}throw Error(result.error||'Unable to open checkout.');}
      if(result.paid&&/^[a-f0-9]{32}$/.test(result.orderId)){location.assign('/checkout?order='+result.orderId);return;}
      const url=new URL(result.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw Error('Unexpected checkout destination.');location.assign(url.href);
    }catch(error){status.textContent=error.message;}finally{pending=false;cta.removeAttribute('aria-disabled');}
  });
  async function loadReviews(){
    try{
      const response=await fetch('/api/shop/reviews');if(!response.ok)throw Error('unavailable');const data=await response.json();
      if(!data.count)return;
      $('[data-review-summary]').textContent=`${Number(data.average).toFixed(1)} / 5 · ${data.count} verified ${data.count===1?'review':'reviews'}`;
      const grid=document.createElement('div');grid.className='pb-review-grid';
      for(const review of data.reviews){
        const card=document.createElement('article');card.className='pb-review-card';
        const stars=document.createElement('span');stars.className='review-stars';stars.textContent='★'.repeat(review.rating)+'☆'.repeat(5-review.rating);stars.setAttribute('aria-label',review.rating+' out of 5 stars');
        const title=document.createElement('h3');title.textContent=review.title;const body=document.createElement('p');body.textContent=review.body;
        const detail=document.createElement('small');detail.textContent=names[review.holders]+(review.holders?' · '+(review.finish==='silver'?'Silver':'Black'):'');
        const footer=document.createElement('footer');footer.textContent=review.display_name+' · Verified purchase';
        card.append(stars,title,body,detail,footer);grid.append(card);
      }
      $('[data-review-list]').replaceChildren(grid);
    }catch{$('[data-review-summary]').textContent='Reviews are temporarily unavailable';}
  }
  render();if(params.get('checkout')==='cancelled')status.textContent='Checkout was cancelled. Your setup is still here.';
  fetch('/api/shop/catalog').then(async response=>{if(!response.ok)throw Error('unavailable');catalog=await response.json();for(const offer of catalog.offers)$(`[data-option-price="${offer.holders}"]`).textContent=money(offer.amount);render();}).catch(()=>{status.textContent='Live availability could not be loaded. You can still save or enquire about your setup.';});
  loadReviews();
})();
