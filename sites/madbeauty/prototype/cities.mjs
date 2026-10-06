// All 103 Lithuanian cities, shared by search, provider forms and server validation.
// Source: Lietuvos mokyklų žaidynės 2024–2025, official city list (p. 8).
// https://kksus.lmnsc.lt/kksusadmin/kiti/lmitkcedit/uploads/files/2024-2025%20m.m.%20LM%C5%BD%20pagrindiniai%20nuostatai%20patvirtinti_1.pdf
const names = [
  'Vilnius', 'Kaunas', 'Klaipėda', 'Šiauliai', 'Panevėžys',
  'Akmenė', 'Alytus', 'Anykščiai', 'Ariogala', 'Baltoji Vokė', 'Birštonas', 'Biržai',
  'Daugai', 'Druskininkai', 'Dūkštas', 'Dusetos', 'Eišiškės', 'Elektrėnai', 'Ežerėlis',
  'Gargždai', 'Garliava', 'Gelgaudiškis', 'Grigiškės', 'Ignalina', 'Jieznas', 'Jonava',
  'Joniškėlis', 'Joniškis', 'Jurbarkas', 'Kaišiadorys', 'Kalvarija', 'Kavarskas',
  'Kazlų Rūda', 'Kėdainiai', 'Kelmė', 'Kretinga', 'Kudirkos Naumiestis', 'Kupiškis',
  'Kuršėnai', 'Kybartai', 'Lazdijai', 'Lentvaris', 'Linkuva', 'Marijampolė', 'Mažeikiai',
  'Molėtai', 'Naujoji Akmenė', 'Nemenčinė', 'Neringa', 'Obeliai', 'Pabradė', 'Pagėgiai',
  'Pakruojis', 'Palanga', 'Pandėlys', 'Panemunė', 'Pasvalys', 'Plungė', 'Priekulė',
  'Prienai', 'Radviliškis', 'Ramygala', 'Raseiniai', 'Rietavas', 'Rokiškis', 'Rūdiškės',
  'Salantai', 'Seda', 'Simnas', 'Skaudvilė', 'Skuodas', 'Smalininkai', 'Subačius',
  'Šakiai', 'Šalčininkai', 'Šeduva', 'Šilalė', 'Šilutė', 'Širvintos', 'Švenčionėliai',
  'Švenčionys', 'Tauragė', 'Telšiai', 'Trakai', 'Troškūnai', 'Tytuvėnai', 'Ukmergė',
  'Utena', 'Užventis', 'Vabalninkas', 'Varėna', 'Varniai', 'Veisiejai', 'Venta',
  'Viekšniai', 'Vievis', 'Vilkaviškis', 'Vilkija', 'Virbalis', 'Visaginas', 'Zarasai',
  'Žagarė', 'Žiežmariai',
];
const slug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
export const CITIES = Object.freeze(names.map(name => Object.freeze([slug(name), name])));
export const CITY_NAMES = Object.freeze(names);
export const cityName = id => CITIES.find(([slug]) => slug === id)?.[1] || '';
export const isCityId = id => CITIES.some(([slug]) => slug === id);
