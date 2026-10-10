// Recover even when app initialization fails or module transport never completes.
let failureShown=false,previousMainRole=null;
function showFailure(title='Puslapio įkelti nepavyko',copy='Patikrink interneto ryšį ir bandyk dar kartą.'){
 if(failureShown)return;
 const main=document.getElementById('main');
 if(!main)return;
 failureShown=true;previousMainRole=main.getAttribute('role');
 const page=document.createElement('div'),heading=document.createElement('h1'),message=document.createElement('p'),retry=document.createElement('button');
 page.className='page container';heading.textContent=title;message.textContent=copy;
 retry.type='button';retry.className='button accent';retry.textContent='Bandyti dar kartą';retry.addEventListener('click',()=>location.reload());
 page.append(heading,message,retry);main.replaceChildren(page);main.setAttribute('aria-busy','false');main.setAttribute('role','alert');document.title=title+' · Madbeauty';main.focus({preventScroll:true});
 const header=document.getElementById('header');if(header&&!header.hasChildNodes()){const brand=document.createElement('a'),dot=document.createElement('span');brand.className='brand';brand.href='/';brand.setAttribute('aria-label','Madbeauty pradžia');dot.textContent='.';brand.append('madbeauty',dot);header.append(brand);}
}
const initializationTimer=setTimeout(()=>showFailure('Puslapio įkėlimas užtruko','Patikrink interneto ryšį ir bandyk dar kartą.'),30000);
import('./app.mjs').then(()=>{
 clearTimeout(initializationTimer);
 if(failureShown){const main=document.getElementById('main');if(main?.getAttribute('role')==='alert'){if(previousMainRole===null)main.removeAttribute('role');else main.setAttribute('role',previousMainRole);}}
}).catch(()=>{clearTimeout(initializationTimer);showFailure();});
