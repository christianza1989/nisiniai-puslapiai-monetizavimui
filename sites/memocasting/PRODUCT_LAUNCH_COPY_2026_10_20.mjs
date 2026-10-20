// Scoped corrections to three native product/catalog pages. Approval is recorded
// separately against the actual edited revision, never by this transform.
export function productLaunchCopy(page) {
  const body = structuredClone(page.body);
  if (page.slug === 'ranku-liejimo-rinkiniai') {
    body[1].text = 'Supakuotas poros rinkinys sveria 2,2 kg, jo pakuotės matmenys – 20 × 20 × 17 cm. Šeimos rinkinys sveria 4,5 kg, jo pakuotė – 25 × 25 × 20 cm. Pristatymo Lietuvoje kaina apskaičiuojama krepšelyje pagal gavėjo adresą ir užsakymo siuntą. Pakuotės matmenys nenustato rinkiniui tinkamo rankų skaičiaus.';
    body[3].text = 'Maišymo pagaliukai ir balti dažai įeina į poros ir šeimos rinkinius. Medinis pagrindas į bazinį komplektą neįeina ir šiuo metu svetainėje neparduodamas. Pasirinkto rinkinio, pristatymo ir bendrą sumą patikrinkite krepšelyje prieš apmokėjimą.';
    return {body};
  }
  const couple = page.slug === 'rinkinys-porai';
  if (!couple && page.slug !== 'seimos-rinkinys') throw Error('outside_product_launch_scope');
  const shipping = body.findIndex(block => block.type === 'heading' && block.text === 'Pakuotė ir pristatymas');
  body[shipping + 1].text = couple
    ? 'Supakuotas poros rinkinys su baltais dažais sveria 2,2 kg, pakuotės matmenys – 20 × 20 × 17 cm. Rinkinio kaina – 32 €. Pristatymas Lietuvoje apskaičiuojamas atskirai krepšelyje pagal gavėjo adresą ir užsakymo siuntą. Galutinę sumą matysite prieš apmokėjimą.'
    : 'Supakuotas šeimos rinkinys su baltais dažais sveria 4,5 kg, pakuotės matmenys – 25 × 25 × 20 cm. Rinkinio kaina – 48 €. Pristatymas Lietuvoje apskaičiuojamas atskirai krepšelyje pagal gavėjo adresą ir užsakymo siuntą. Galutinę sumą matysite prieš apmokėjimą.';
  if (couple) body[shipping + 2].text = 'Patikrinkite instrukcijos informaciją ir apgalvokite, ar dovanosite rinkinį, ar planuosite bendrą veiklą. Užsakymą galite apmokėti per Stripe krepšelyje.';
  const addon = body.findIndex(block => block.type === 'heading' && block.text === 'Pasirenkamas medinis pagrindas');
  if (addon < 0) throw Error('expected_original_addon_section');
  body.splice(addon, body.length - addon,
    {type:'heading',level:2,text:'Papildomi priedai'},
    {type:'paragraph',text:'Medinis pagrindas į bazinį rinkinį neįeina ir šiuo metu svetainėje neparduodamas. Balti dažai jau įtraukti į rinkinio kainą – jų atskirai pridėti nereikia.'});
  return {body, media: page.media.filter(media => !media.alt.includes('medinio pagrindo'))};
}
