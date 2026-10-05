async (page) => {
 const root='C:/Users/lenovo/Documents/nisiniai_puslapiai_monetizavimui/sites/autoelektrikaivilniuje/research/';
 for(const [name,url,label]of [['aa-guide','https://www.theaa.com/breakdown-cover/advice/starting-a-car','Decline All'],['kalo','https://www.kalo.lt/paslauga/autoelektrikas-elektronikos-remontas/vilniuje','Tik būtinieji'],['bosch-de','https://www.boschcarservice.com/de/de/werkstattleistungen/elektronik-service/batterie-service/','Alles ablehnen'],['bosch-pl','https://www.boschcarservice.com/pl/pl/','Odrzuć wszystko']]){
  await page.setViewportSize({width:390,height:844});await page.goto(url,{waitUntil:'domcontentloaded'});
  const button=page.getByRole('button',{name:label,exact:true});if(await button.isVisible())await button.click();
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:root+name+'-mobile-clear.png'});
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:root+name+'-desktop-clear.png'});
 }
}
