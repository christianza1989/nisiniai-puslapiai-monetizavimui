// Recover even when app initialization fails before its event handlers are ready.
import('./app.mjs').catch(()=>{
 const main=document.getElementById('main');
 if(!main)return;
 const page=document.createElement('div'),heading=document.createElement('h1'),message=document.createElement('p'),retry=document.createElement('button');
 page.className='page container';heading.textContent='Puslapio įkelti nepavyko';message.textContent='Patikrink interneto ryšį ir bandyk dar kartą.';
 retry.type='button';retry.className='button accent';retry.textContent='Bandyti dar kartą';retry.addEventListener('click',()=>location.reload());
 page.append(heading,message,retry);main.replaceChildren(page);main.setAttribute('aria-busy','false');main.setAttribute('role','alert');document.title='Puslapio įkelti nepavyko · Madbeauty';main.focus({preventScroll:true});
 const header=document.getElementById('header');if(header&&!header.hasChildNodes()){const brand=document.createElement('a'),dot=document.createElement('span');brand.className='brand';brand.href='/';brand.setAttribute('aria-label','Madbeauty pradžia');dot.textContent='.';brand.append('madbeauty',dot);header.append(brand);}
});
