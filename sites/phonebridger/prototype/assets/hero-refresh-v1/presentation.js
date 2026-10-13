/* Idle label presentation only. Input dispatch, capture and cursor logic remain in their existing files. */
(() => {
  const button=document.querySelector('.hr-hero .mouse-control');
  const hint=document.querySelector('.hr-hero [data-hint]');
  if(!button)return;
  const label=()=>{
    // Existing simulator restores its old idle wording after reset/Escape/capture failure.
    // Preserve its starting/active states and update only that exact idle label.
    if(!/^Try mouse control\s*↗?$/.test(button.textContent.trim()))return;
    button.innerHTML='<svg class="icon" aria-hidden="true"><use href="#i-mouse"/></svg><span>Try the live demo</span><svg class="hr-icon" aria-hidden="true" viewBox="0 0 24 24"><use href="assets/hero-refresh-v1/icons.svg#arrow"/></svg>';
  };
  new MutationObserver(label).observe(button,{childList:true,subtree:true,characterData:true});
  label();
  if(hint){
    const wording=()=>{if(hint.textContent.includes('Try mouse control'))hint.textContent=hint.textContent.replaceAll('Try mouse control','Try the live demo');};
    new MutationObserver(wording).observe(hint,{childList:true,subtree:true,characterData:true});wording();
  }
})();
