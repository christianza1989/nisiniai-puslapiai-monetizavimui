(()=>{
 const main=document.querySelector('main'),verify=location.pathname.replace(/\/$/,'')==='/verify',token=new URLSearchParams(location.hash.slice(1)).get('token');
 // Keep secret links out of request URLs, history, analytics and referrers.
 if(location.hash)history.replaceState(null,'',location.pathname);
 const valid=/^[a-f0-9]{64}$/.test(token||''),field=(name,label,type,extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" required ${extra}></label>`;
 main.innerHTML=`<div class="eyebrow">YOUR ACCOUNT</div><h1>${verify?'Verify your email':valid?'Choose a new password':'Get back to your workspace'}</h1><p class="muted">${verify?'Confirm this email address for your PhoneBridger account.':valid?'Resetting your password signs out all existing sessions.':'We’ll send a secure reset link if this email belongs to an account.'}</p><section class="card">${verify&&!valid?'<p>This verification link is missing or invalid. Sign in and request a new link in Account settings.</p>':`<form class="form-grid">${verify?'':valid?field('password','New password','password','minlength="6" maxlength="128" autocomplete="new-password"')+field('confirm','Confirm new password','password','minlength="6" maxlength="128" autocomplete="new-password"'):field('email','Account email','email','maxlength="254" autocomplete="email"')}<button class="button primary" type="submit">${verify?'Verify email':valid?'Reset password':'Send reset link'}</button><p role="status" aria-live="polite" class="hint" data-status></p></form>`}</section>`;
 const form=main.querySelector('form');form?.addEventListener('submit',async e=>{
  e.preventDefault();if(!form.reportValidity())return;const b=form.querySelector('button'),s=form.querySelector('[data-status]'),data=Object.fromEntries(new FormData(form));
  if(valid&&!verify&&data.password!==data.confirm){s.textContent='Your passwords do not match.';form.elements.confirm.focus();return;}
  b.disabled=true;s.textContent='Working…';try{
   const action=verify?'verify-email':valid?'reset-password':'request-reset',payload=verify?{token}:valid?{token,password:data.password}:{email:data.email};
   const r=await fetch('/api/account/'+action,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await r.json();if(!r.ok)throw Error(result.error||'Please try again.');
   form.reset();s.textContent=result.message;s.tabIndex=-1;s.focus();if(valid){b.hidden=true;const a=document.createElement('a');a.href=verify?'/account/settings':'/login';a.className='button outline';a.textContent=verify?'Open account settings':'Sign in';form.append(a);}
  }catch(error){s.textContent=error.message;b.disabled=false;}
 });
})();
