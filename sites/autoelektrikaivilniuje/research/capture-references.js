async (page) => {
 const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/autoelektrikaivilniuje/research/';
 const refs=[['kemi','https://www.kemi.lt/paslaugos/elektros-sistemu-diagnostika-ir-remontas'],['checkengine','https://autoelektrikai.lt/automobiliu-elektrikas-vilniuje/'],['kalo','https://www.kalo.lt/paslauga/autoelektrikas-elektronikos-remontas/vilniuje'],['fixmycar','https://www.whocanfixmycar.com/for-garages/packages'],['bosch-de','https://www.boschcarservice.com/de/de/werkstattleistungen/elektronik-service/batterie-service/'],['bosch-pl','https://www.boschcarservice.com/pl/pl/'],['aa-guide','https://www.theaa.com/breakdown-cover/advice/starting-a-car']];
 for(const [name,url]of refs){
  try{
   await page.setViewportSize({width:1440,height:1000});const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().top<1200).map(i=>i.decode().catch(()=>{})));});
   await page.screenshot({path:root+name+'-desktop.png',fullPage:false});
   console.log(JSON.stringify({name,url:page.url(),status:response?.status(),title:await page.title(),width:1440,images:await page.evaluate(()=>[...document.images].filter(i=>i.getBoundingClientRect().top<1200).map(i=>({loaded:i.complete&&i.naturalWidth>0,alt:i.alt})))}));
   await page.setViewportSize({width:390,height:844}); await page.screenshot({path:root+name+'-mobile.png',fullPage:false});
  }catch(e){console.log(JSON.stringify({name,url,error:String(e)}));}
 }
}
