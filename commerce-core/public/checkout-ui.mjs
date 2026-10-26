import {
  CommerceClient,
  normalizedChoices,
  selectionKey,
  resolveCatalogSelection,
} from './commerce-client.mjs';
const translations = {
  lt: [
    'Užsakymas',
    'Prekė',
    'Kiekis',
    'Šalis',
    'Pristatymas',
    'Vardas ir pavardė',
    'El. paštas',
    'Telefonas, su šalies kodu',
    'Adresas',
    'Miestas',
    'Pašto kodas',
    'Paštomatas',
    'Patvirtinu pirkimo sąlygas',
    'Patikrinti sumą',
    'Sukurti užsakymą',
    'Apmokėti',
    'Atnaujinti būseną',
    'Pranešti apie atsisakymą',
    'Naujas užsakymas',
    'Bandomoji aplinka',
    'Prekyba dar ruošiama',
    'Suma',
    'Laukia mokėjimo',
    'Apmokėta',
    'Dalis sumos grąžinta',
    'Suma grąžinta',
    'Mokėjimas nepavyko',
    'Užsakymas išsaugotas',
    'Atsisakymo prašymas išsaugotas',
    'Veiksmas nepavyko. Patikrinkite duomenis ir pakartokite.',
    'Ryšys nutrūko. Pakartokite tą patį veiksmą.',
    'Pristatymo būdų šiai šaliai dar nėra.',
    'Pasirinkite pristatymą ir patikrinkite sumą.',
    'Dokumentai',
    'Siuntos būsena',
  ],
  pl: [
    'Zamówienie',
    'Produkt',
    'Ilość',
    'Kraj',
    'Dostawa',
    'Imię i nazwisko',
    'E-mail',
    'Telefon z kodem kraju',
    'Adres',
    'Miasto',
    'Kod pocztowy',
    'Paczkomat',
    'Akceptuję warunki zakupu',
    'Sprawdź kwotę',
    'Złóż zamówienie',
    'Zapłać',
    'Odśwież status',
    'Zgłoś odstąpienie',
    'Nowe zamówienie',
    'Środowisko testowe',
    'Sprzedaż jest przygotowywana',
    'Kwota',
    'Oczekuje na płatność',
    'Opłacone',
    'Częściowy zwrot',
    'Zwrócono kwotę',
    'Płatność nie powiodła się',
    'Zamówienie zapisane',
    'Zgłoszenie odstąpienia zapisane',
    'Operacja nie powiodła się. Sprawdź dane i spróbuj ponownie.',
    'Połączenie przerwane. Powtórz tę samą operację.',
    'Brak dostępnych sposobów dostawy do tego kraju.',
    'Wybierz dostawę i sprawdź kwotę.',
    'Dokumenty',
    'Status przesyłki',
  ],
  lv: [
    'Pasūtījums',
    'Prece',
    'Daudzums',
    'Valsts',
    'Piegāde',
    'Vārds un uzvārds',
    'E-pasts',
    'Tālrunis ar valsts kodu',
    'Adrese',
    'Pilsēta',
    'Pasta indekss',
    'Pakomāts',
    'Piekrītu pirkuma noteikumiem',
    'Pārbaudīt summu',
    'Veikt pasūtījumu',
    'Maksāt',
    'Atjaunināt statusu',
    'Paziņot par atteikumu',
    'Jauns pasūtījums',
    'Testa vide',
    'Tirdzniecība tiek sagatavota',
    'Summa',
    'Gaida maksājumu',
    'Apmaksāts',
    'Daļēja atmaksa',
    'Summa atmaksāta',
    'Maksājums neizdevās',
    'Pasūtījums saglabāts',
    'Atteikuma pieteikums saglabāts',
    'Darbība neizdevās. Pārbaudiet datus un mēģiniet vēlreiz.',
    'Savienojums pārtrūka. Atkārtojiet to pašu darbību.',
    'Šai valstij vēl nav piegādes veidu.',
    'Izvēlieties piegādi un pārbaudiet summu.',
    'Dokumenti',
    'Sūtījuma statuss',
  ],
  et: [
    'Tellimus',
    'Toode',
    'Kogus',
    'Riik',
    'Tarne',
    'Ees- ja perekonnanimi',
    'E-post',
    'Telefon koos riigikoodiga',
    'Aadress',
    'Linn',
    'Postiindeks',
    'Pakiautomaat',
    'Nõustun ostutingimustega',
    'Kontrolli summat',
    'Esita tellimus',
    'Maksa',
    'Värskenda olekut',
    'Teata taganemisest',
    'Uus tellimus',
    'Testkeskkond',
    'Müük on ettevalmistamisel',
    'Summa',
    'Ootab makset',
    'Makstud',
    'Osaline tagasimakse',
    'Summa tagastatud',
    'Makse ebaõnnestus',
    'Tellimus salvestatud',
    'Taganemisteade salvestatud',
    'Toiming ebaõnnestus. Kontrollige andmeid ja proovige uuesti.',
    'Ühendus katkes. Korrake sama toimingut.',
    'Selle riigi jaoks pole veel tarneviise.',
    'Valige tarne ja kontrollige summat.',
    'Dokumendid',
    'Saadetise olek',
  ],
};
const element = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'disabled') el.disabled = value;
    else el.setAttribute(key, value);
  }
  el.append(...children.flat().filter((c) => c !== undefined && c !== null));
  return el;
};
const buyerMessages = {
  lt: {
    empty: 'Krepšelis tuščias.',
    unpaid: 'Neapmokėtas',
    catalogue: 'Išsirinkti rinkinį',
    expired: 'Rezervacija pasibaigė. Norėdami pirkti, pradėkite naują užsakymą.',
    paymentOff: 'Mokėjimas šiuo metu neįjungtas.',
    delivery: 'Patvirtintas pristatymas',
    held: 'Užsakymo vykdymas sustabdytas. Susisiekite su klientų aptarnavimu.',
    canceled: 'Užsakymo vykdymas atšauktas.',
    returned: 'Prekių grąžinimas užregistruotas.',
  },
  pl: {
    empty: 'Koszyk jest pusty.',
    unpaid: 'Nieopłacone',
    catalogue: 'Wybierz zestaw',
    expired: 'Rezerwacja wygasła. Aby kupić, rozpocznij nowe zamówienie.',
    paymentOff: 'Płatności są obecnie wyłączone.',
    delivery: 'Potwierdzona dostawa',
    held: 'Realizacja zamówienia została wstrzymana. Skontaktuj się z obsługą klienta.',
    canceled: 'Realizacja zamówienia została anulowana.',
    returned: 'Zwrot produktów został zarejestrowany.',
  },
  lv: {
    empty: 'Grozs ir tukšs.',
    unpaid: 'Nav apmaksāts',
    catalogue: 'Izvēlēties komplektu',
    expired: 'Rezervācijas termiņš ir beidzies. Lai iegādātos, sāciet jaunu pasūtījumu.',
    paymentOff: 'Maksājumi pašlaik nav pieejami.',
    delivery: 'Apstiprinātā piegāde',
    held: 'Pasūtījuma izpilde ir apturēta. Sazinieties ar klientu apkalpošanu.',
    canceled: 'Pasūtījuma izpilde ir atcelta.',
    returned: 'Preču atgriešana ir reģistrēta.',
  },
  et: {
    empty: 'Ostukorv on tühi.',
    unpaid: 'Maksmata',
    catalogue: 'Valige komplekt',
    expired: 'Broneering on aegunud. Ostmiseks alustage uut tellimust.',
    paymentOff: 'Maksmine pole praegu saadaval.',
    delivery: 'Kinnitatud tarne',
    held: 'Tellimuse täitmine on peatatud. Võtke ühendust klienditeenindusega.',
    canceled: 'Tellimuse täitmine on tühistatud.',
    returned: 'Kauba tagastamine on registreeritud.',
  },
};
export function resolveTermsLink(termsUrl, context, origin) {
  try {
    const value = typeof termsUrl === 'function' ? termsUrl(context) : termsUrl;
    if (typeof value !== 'string' || !value.trim() || value.length > 2000) return null;
    const url = new URL(value, origin);
    if (url.origin !== origin || url.username || url.password) return null;
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}
export function normalizeCheckoutCart(lines, catalog) {
  if (!Array.isArray(lines) || lines.length > 100 || !Array.isArray(catalog)) return [];
  const allowed = new Set(catalog.filter((p) => p.enabled !== false).map((p) => p.sku));
  const quantities = new Map(),
    totals = new Map();
  for (const line of lines) {
    if (
      !line ||
      !allowed.has(line.sku) ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 0 ||
      line.quantity > 100
    )
      continue;
    let choices;
    try {
      choices = normalizedChoices(line.choices);
    } catch {
      return [];
    }
    const key = selectionKey(line),
      total = (totals.get(line.sku) || 0) + line.quantity;
    if (total > 100) return [];
    totals.set(line.sku, total);
    quantities.set(key, {
      sku: line.sku,
      quantity: (quantities.get(key)?.quantity || 0) + line.quantity,
      ...(Object.keys(choices).length ? { choices } : {}),
    });
  }
  return [...quantities.values()].filter((line) => line.quantity > 0);
}
const discountMessages = {
  lt: {
    code: 'Nuolaidos kodas',
    placeholder: 'Įveskite kodą',
    apply: 'Pritaikyti',
    remove: 'Pašalinti kodą',
    discount: 'Nuolaida',
    checking: 'Tikrinamas kodas…',
    applied: 'Kodas pritaikytas.',
    freeShipping: 'Nemokamas pristatymas',
    paymentMinimum:
      'Po nuolaidos mokėtina suma turi būti bent 0,50 €. Pakeiskite prekes arba pašalinkite kodą.',
    invalid: 'Šis kodas negalioja arba jo limitas pasiektas.',
    minimum: 'Prekių suma per maža šiam kodui. Patikrinkite sąlygas arba pašalinkite kodą.',
    network: 'Nepavyko patikrinti kodo. Bandykite dar kartą.',
  },
  pl: {
    code: 'Kod rabatowy',
    placeholder: 'Wpisz kod',
    apply: 'Zastosuj',
    remove: 'Usuń kod',
    discount: 'Rabat',
    checking: 'Sprawdzanie kodu…',
    applied: 'Kod został zastosowany.',
    freeShipping: 'Darmowa dostawa',
    paymentMinimum:
      'Po rabacie do zapłaty musi pozostać co najmniej 0,50 €. Zmień produkty lub usuń kod.',
    invalid: 'Kod jest nieaktywny lub jego limit został osiągnięty.',
    minimum: 'Wartość produktów jest za niska dla tego kodu. Sprawdź warunki lub usuń kod.',
    network: 'Nie udało się sprawdzić kodu. Spróbuj ponownie.',
  },
  lv: {
    code: 'Atlaides kods',
    placeholder: 'Ievadiet kodu',
    apply: 'Piemērot',
    remove: 'Noņemt kodu',
    discount: 'Atlaide',
    checking: 'Pārbauda kodu…',
    applied: 'Kods ir piemērots.',
    freeShipping: 'Bezmaksas piegāde',
    paymentMinimum:
      'Pēc atlaides maksājamajai summai jābūt vismaz 0,50 €. Mainiet preces vai noņemiet kodu.',
    invalid: 'Kods nav derīgs vai tā limits ir sasniegts.',
    minimum: 'Preču summa ir pārāk maza šim kodam. Pārbaudiet noteikumus vai noņemiet kodu.',
    network: 'Kodu neizdevās pārbaudīt. Mēģiniet vēlreiz.',
  },
  et: {
    code: 'Sooduskood',
    placeholder: 'Sisestage kood',
    apply: 'Rakenda',
    remove: 'Eemalda kood',
    discount: 'Soodustus',
    checking: 'Koodi kontrollimine…',
    applied: 'Kood on rakendatud.',
    freeShipping: 'Tasuta tarne',
    paymentMinimum:
      'Pärast soodustust peab tasuda jääma vähemalt 0,50 €. Muutke tooteid või eemaldage kood.',
    invalid: 'Kood ei kehti või selle kasutuspiir on täis.',
    minimum:
      'Toodete summa on selle koodi jaoks liiga väike. Kontrollige tingimusi või eemaldage kood.',
    network: 'Koodi ei saanud kontrollida. Proovige uuesti.',
  },
};
export function quoteDiscountAmount(quote) {
  if (!quote.discount) return 0;
  const d = quote.discount,
    gross = quote.lines.reduce((n, l) => n + l.unitAmount * l.quantity, 0);
  if (
    typeof d.code !== 'string' ||
    !/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(d.code) ||
    !Number.isSafeInteger(d.amount) ||
    d.amount <= 0 ||
    d.amount >= gross ||
    (d.freeShipping !== undefined && typeof d.freeShipping !== 'boolean') ||
    (d.freeShipping === true &&
      quote.delivery &&
      (quote.delivery.amount !== 0 ||
        !Number.isSafeInteger(d.shippingAmount) ||
        d.shippingAmount < 0 ||
        quote.delivery.amountBeforeDiscount !== d.shippingAmount)) ||
    quote.lines.some(
      (l) =>
        !Number.isSafeInteger(l.discountAmount) ||
        l.discountAmount < 0 ||
        l.discountAmount > l.unitAmount * l.quantity ||
        l.netLineAmount !== l.unitAmount * l.quantity - l.discountAmount,
    ) ||
    quote.lines.reduce((n, l) => n + l.discountAmount, 0) !== d.amount
  )
    throw new Error('invalid_quote');
  return d.amount;
}
const onePageMessages = {
  lt: {
    intro: 'Jūsų pasirinkimas, pristatymas ir apmokėjimas – vienoje vietoje.',
    items: 'Jūsų pasirinkimas',
    contact: 'Kontaktiniai duomenys',
    contactHint: 'Šiuo el. paštu gausite užsakymo informaciją.',
    address: 'Pristatymo duomenys',
    method: 'Pristatymo būdas',
    summary: 'Užsakymo suma',
    subtotal: 'Prekės',
    shipping: 'Pristatymas',
    total: 'Iš viso',
    calculated: 'Pagal pristatymo duomenis',
    continue: 'Tęsti į apmokėjimą',
    checking: 'Tikriname galutinę sumą…',
    remove: 'Pašalinti',
    decrease: 'Sumažinti kiekį',
    increase: 'Padidinti kiekį',
    each: 'vnt.',
    empty: 'Jūsų krepšelis kol kas tuščias.',
    emptyHint: 'Pasirinkite rinkinį, o čia galėsite užbaigti užsakymą.',
    terms: 'Sutinku su pirkimo sąlygomis',
    payment: 'Saugus apmokėjimas per „Stripe“.',
    guest: 'Paskyros kurti nereikia.',
    closed: 'Šiuo metu užsakymų priėmimas laikinai sustabdytas.',
    noDelivery: 'Pristatymo pasirinkimai šiuo metu nepasiekiami.',
    deliveryUnavailable: 'Pristatymo kainos paslauga laikinai nepasiekiama. Bandykite dar kartą.',
    quoteError:
      'Nepavyko patikrinti pristatymo kainos. Patikrinkite duomenis ir bandykite dar kartą.',
    unavailable: 'Pasirinkta prekė arba jos kiekis šiuo metu nepasiekiami.',
    unknown: 'Kaina nepasiekiama',
    secure: 'Apmokėjimas',
    review: 'Patikrinkite užsakymą ir pasirinkite mokėjimo būdą.',
  },
  pl: {
    intro: 'Twój wybór, dostawa i płatność – w jednym miejscu.',
    items: 'Twój wybór',
    contact: 'Dane kontaktowe',
    contactHint: 'Na ten adres e-mail otrzymasz informacje o zamówieniu.',
    address: 'Adres dostawy',
    method: 'Sposób dostawy',
    summary: 'Podsumowanie',
    subtotal: 'Produkty',
    shipping: 'Dostawa',
    total: 'Razem',
    calculated: 'Według danych dostawy',
    continue: 'Przejdź do płatności',
    checking: 'Sprawdzamy ostateczną kwotę…',
    remove: 'Usuń',
    decrease: 'Zmniejsz ilość',
    increase: 'Zwiększ ilość',
    each: 'szt.',
    empty: 'Twój koszyk jest na razie pusty.',
    emptyHint: 'Wybierz zestaw, a tutaj dokończysz zamówienie.',
    terms: 'Akceptuję warunki zakupu',
    payment: 'Bezpieczna płatność przez Stripe.',
    guest: 'Nie musisz zakładać konta.',
    closed: 'Przyjmowanie zamówień jest tymczasowo wstrzymane.',
    noDelivery: 'Opcje dostawy są obecnie niedostępne.',
    quoteError: 'Nie udało się sprawdzić kosztu dostawy. Sprawdź dane i spróbuj ponownie.',
    deliveryUnavailable: 'Usługa wyceny dostawy jest chwilowo niedostępna. Spróbuj ponownie.',
    unavailable: 'Wybrany produkt lub ilość są obecnie niedostępne.',
    unknown: 'Cena niedostępna',
    secure: 'Płatność',
    review: 'Sprawdź zamówienie i wybierz sposób płatności.',
  },
  lv: {
    intro: 'Jūsu izvēle, piegāde un apmaksa – vienuviet.',
    items: 'Jūsu izvēle',
    contact: 'Kontaktinformācija',
    contactHint: 'Uz šo e-pasta adresi saņemsiet pasūtījuma informāciju.',
    address: 'Piegādes adrese',
    method: 'Piegādes veids',
    summary: 'Pasūtījuma kopsavilkums',
    subtotal: 'Preces',
    shipping: 'Piegāde',
    total: 'Kopā',
    calculated: 'Pēc piegādes datiem',
    continue: 'Turpināt apmaksu',
    checking: 'Pārbaudām galīgo summu…',
    remove: 'Noņemt',
    decrease: 'Samazināt daudzumu',
    increase: 'Palielināt daudzumu',
    each: 'gab.',
    empty: 'Jūsu grozs pagaidām ir tukšs.',
    emptyHint: 'Izvēlieties komplektu un šeit pabeidziet pasūtījumu.',
    terms: 'Piekrītu pirkuma noteikumiem',
    payment: 'Droša apmaksa ar Stripe.',
    guest: 'Konts nav jāizveido.',
    closed: 'Pasūtījumu pieņemšana uz laiku ir apturēta.',
    noDelivery: 'Piegādes iespējas pašlaik nav pieejamas.',
    quoteError: 'Neizdevās pārbaudīt piegādes cenu. Pārbaudiet datus un mēģiniet vēlreiz.',
    deliveryUnavailable:
      'Piegādes cenas aprēķināšanas pakalpojums īslaicīgi nav pieejams. Mēģiniet vēlreiz.',
    unavailable: 'Izvēlētā prece vai daudzums pašlaik nav pieejams.',
    unknown: 'Cena nav pieejama',
    secure: 'Apmaksa',
    review: 'Pārbaudiet pasūtījumu un izvēlieties maksājuma veidu.',
  },
  et: {
    intro: 'Teie valik, tarne ja makse – ühes kohas.',
    items: 'Teie valik',
    contact: 'Kontaktandmed',
    contactHint: 'Sellele e-posti aadressile saadame tellimuse info.',
    address: 'Tarneaadress',
    method: 'Tarneviis',
    summary: 'Tellimuse kokkuvõte',
    subtotal: 'Tooted',
    shipping: 'Tarne',
    total: 'Kokku',
    calculated: 'Tarneandmete järgi',
    continue: 'Jätka maksmisega',
    checking: 'Kontrollime lõplikku summat…',
    remove: 'Eemalda',
    decrease: 'Vähenda kogust',
    increase: 'Suurenda kogust',
    each: 'tk',
    empty: 'Teie ostukorv on praegu tühi.',
    emptyHint: 'Valige komplekt ja lõpetage tellimus siin.',
    terms: 'Nõustun ostutingimustega',
    payment: 'Turvaline makse Stripe’i kaudu.',
    guest: 'Kontot pole vaja luua.',
    closed: 'Tellimuste vastuvõtmine on ajutiselt peatatud.',
    noDelivery: 'Tarnevalikud pole praegu saadaval.',
    quoteError: 'Tarnehinna kontrollimine ebaõnnestus. Kontrollige andmeid ja proovige uuesti.',
    deliveryUnavailable: 'Tarnehinna arvutamise teenus pole ajutiselt saadaval. Proovige uuesti.',
    unavailable: 'Valitud toode või kogus pole praegu saadaval.',
    unknown: 'Hind pole saadaval',
    secure: 'Maksmine',
    review: 'Kontrollige tellimust ja valige makseviis.',
  },
};

// Optional storefront presentation. Business validation and replay identity stay in CommerceClient.
function onePageForm({
  content,
  status,
  client,
  context,
  catalog,
  markets,
  cartLines,
  country,
  language,
  t,
  m,
  money,
  termsUrl,
  catalogueUrl,
  productTitle,
  productImage,
  productsPlacement,
  paymentPlacement,
  embeddedPayment,
  emitCart,
  finish,
  renderPayment,
  resumeOrder,
  restart,
  setPaymentCleanup,
  isCurrent,
  initialOrder,
  restoredOrder,
  signal,
}) {
  const u = onePageMessages[language] || onePageMessages.lt;
  const dc = discountMessages[language] || discountMessages.lt;
  const form = element('form', { class: 'checkout-one-page' });
  const summary = element('aside', { class: 'checkout-summary', 'aria-label': u.summary });
  const details = element('div', { class: 'checkout-details' });
  const items = element('div', { class: 'checkout-items' });
  const fields = {};
  let selectedCountry = country,
    quoted,
    pendingQuote,
    lockedForOrder = Boolean(initialOrder),
    version = 0,
    timer,
    busy = false,
    lastCart = JSON.stringify(cartLines),
    activeDiscountCode = initialOrder?.snapshot?.discount?.code || '',
    couponPreview,
    couponPending = false,
    couponTicket = 0,
    couponTimer,
    couponLastAttempt = '';
  const market = () => markets.find((v) => v.country === selectedCountry);
  const canOrder = Boolean(
    (context.productionReady || context.canCreateTestOrder) &&
    context.paymentConnected &&
    (!embeddedPayment || context.embeddedCheckoutConfigured !== false),
  );
  const field = (parent, name, label, attrs = {}, tag = 'input') => {
    const input = element(tag, { id: 'checkout-' + name, name, ...attrs });
    fields[name] = input;
    parent.append(
      element(
        'label',
        { class: 'checkout-field', for: 'checkout-' + name },
        element('span', {}, label),
        input,
      ),
    );
    return input;
  };
  const group = (label, hint) => {
    const fs = element('fieldset', {}, element('legend', {}, label));
    if (hint) fs.append(element('p', { class: 'checkout-hint' }, hint));
    details.append(fs);
    return fs;
  };
  const contact = group(u.contact, u.contactHint);
  field(contact, 'name', t[5], {
    required: true,
    minlength: 2,
    maxlength: 120,
    autocomplete: 'name',
  });
  field(contact, 'email', t[6], {
    required: true,
    type: 'email',
    maxlength: 254,
    autocomplete: 'email',
    inputmode: 'email',
  });
  field(contact, 'phone', t[7], {
    required: true,
    type: 'tel',
    pattern: '\\+[1-9][0-9]{6,14}',
    maxlength: 16,
    autocomplete: 'tel',
    placeholder: '+37060000000',
  });
  const address = group(u.address);
  const countrySelect = field(
    address,
    'country',
    t[3],
    { autocomplete: 'shipping country' },
    'select',
  );
  for (const item of markets)
    countrySelect.append(
      element(
        'option',
        { value: item.country },
        new Intl.DisplayNames([language], { type: 'region' }).of(item.country) || item.country,
      ),
    );
  if (!markets.some((v) => v.country === selectedCountry))
    selectedCountry = markets[0]?.country || country;
  countrySelect.value = selectedCountry;
  field(address, 'line1', t[8], {
    required: true,
    minlength: 2,
    maxlength: 150,
    autocomplete: 'shipping address-line1',
  });
  const addressRow = element('div', { class: 'checkout-field-row' });
  address.append(addressRow);
  field(addressRow, 'city', t[9], {
    required: true,
    maxlength: 100,
    autocomplete: 'shipping address-level2',
  });
  field(addressRow, 'postalCode', t[10], {
    required: true,
    maxlength: 20,
    autocomplete: 'shipping postal-code',
  });
  const shipping = group(u.method);
  const delivery = field(shipping, 'delivery', t[4], { required: true }, 'select');
  const lockerCopy = {
    lt: {
      search: 'Ieškoti paštomato pagal miestą ar adresą',
      placeholder: 'Pvz., Vilnius, Salininkai',
      empty: 'Paštomatų nerasta. Pabandykite kitą miestą ar gatvę.',
      choose: 'Pasirinkite paštomatą iš sąrašo.',
      selected: 'Pasirinkta: ',
      more: 'Patikslinkite miestą ar gatvę, jei nematote savo paštomato.',
    },
    pl: {
      search: 'Szukaj punktu według miasta lub adresu',
      placeholder: 'Miasto lub ulica',
      empty: 'Nie znaleziono punktów. Wpisz inne miasto lub ulicę.',
      choose: 'Wybierz punkt z listy.',
      selected: 'Wybrano: ',
      more: 'Doprecyzuj miasto lub ulicę, jeśli nie widzisz swojego punktu.',
    },
    lv: {
      search: 'Meklēt pakomātu pēc pilsētas vai adreses',
      placeholder: 'Pilsēta vai iela',
      empty: 'Pakomāti nav atrasti. Ievadiet citu pilsētu vai ielu.',
      choose: 'Izvēlieties pakomātu sarakstā.',
      selected: 'Izvēlēts: ',
      more: 'Precizējiet pilsētu vai ielu, ja neredzat savu pakomātu.',
    },
    et: {
      search: 'Otsi pakiautomaati linna või aadressi järgi',
      placeholder: 'Linn või tänav',
      empty: 'Pakiautomaate ei leitud. Sisestage teine linn või tänav.',
      choose: 'Valige pakiautomaat loendist.',
      selected: 'Valitud: ',
      more: 'Täpsustage linna või tänavat, kui teie pakiautomaati pole näha.',
    },
  }[language] || {
    search: 'Search parcel lockers by city or address',
    placeholder: 'City or street',
    empty: 'No lockers found. Try another city or street.',
    choose: 'Choose a locker from the results.',
    selected: 'Selected: ',
    more: 'Refine the city or street if your locker is not shown.',
  };
  const lockerChooser = element('div', { class: 'checkout-locker' });
  shipping.append(lockerChooser);
  const lockerSearch = field(lockerChooser, 'lockerSearch', lockerCopy.search, {
    type: 'search',
    maxlength: 120,
    autocomplete: 'off',
    placeholder: lockerCopy.placeholder,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': 'checkout-locker-results',
    'aria-describedby': 'checkout-locker-status',
  });
  // The hidden field holds only a trusted location ID, never the typed query.
  const locker = field(shipping, 'locker', t[11], { type: 'hidden' });
  locker.parentElement.hidden = true;
  const lockerResults = element('div', {
    id: 'checkout-locker-results',
    class: 'checkout-locker-results',
    role: 'listbox',
    'aria-label': t[11],
  });
  const lockerStatus = element('p', {
    id: 'checkout-locker-status',
    class: 'checkout-hint checkout-locker-status',
    role: 'status',
    'aria-atomic': 'true',
  });
  lockerChooser.append(lockerResults, lockerStatus);
  let lockerMatches = [],
    lockerActive = -1;
  const lockerHint = element(
    'p',
    { class: 'checkout-hint', role: 'status' },
    language === 'lt'
      ? 'Keliems rinkiniams rinkitės pristatymą kurjeriu.'
      : 'Choose courier delivery for multiple kits.',
  );
  shipping.append(lockerHint);
  let savedDoorAddress = null;
  const noDelivery = element('p', { class: 'checkout-hint', role: 'status' }, u.noDelivery);
  shipping.append(noDelivery);
  const empty = element(
    'div',
    { class: 'checkout-empty' },
    element('h2', {}, u.empty),
    element('p', {}, u.emptyHint),
  );
  const catalogueHref = resolveTermsLink(catalogueUrl, {}, location.origin);
  if (catalogueHref)
    empty.append(element('a', { class: 'checkout-catalogue', href: catalogueHref }, m.catalogue));
  const intro = element('p', { class: 'checkout-intro' }, u.intro);
  if (context.paymentRecovery && language === 'lt') {
    details.append(
      element(
        'p',
        { class: 'checkout-hint' },
        `Neužbaigus apmokėjimo, po ${context.paymentRecovery.reminderAfterHours} val. atsiųsime vieną priminimą el. paštu. Užsakymą galima apmokėti per ${context.paymentRecovery.reservationHours} val. Daugiau priminimų nesiųsime.`,
      ),
    );
  }
  const closed = element('p', { class: 'checkout-notice', role: 'status' }, u.closed);
  const heading = element('h2', {}, u.items);
  const products = element('section', { class: 'checkout-products' }, heading, items);
  // Use one live set of controls in DOM order; never clone cart inputs for a sidebar.
  if (productsPlacement === 'summary') summary.append(products);
  else details.insertBefore(products, details.children[0]);
  summary.append(element('h2', {}, u.summary));
  const selections = [
    ...cartLines,
    ...catalog
      .filter((p) => p.enabled !== false && !cartLines.some((l) => l.sku === p.sku))
      .map((p) => ({ sku: p.sku, quantity: 0 })),
  ];
  const rows = selections.map((selection) => {
    const p = catalog.find((p) => p.sku === selection.sku);
    const count = selection.quantity;
    let configured;
    try {
      configured = resolveCatalogSelection(p, selectedCountry, selection.choices);
    } catch {
      configured = { labels: [] };
    }
    const displayTitle =
      productTitle(p, language) +
      (configured.labels.length ? ' — ' + configured.labels.join(' · ') : '');
    const row = element('div', { class: 'checkout-item' });
    const image =
      configured.image?.src ?? (typeof productImage === 'function' ? productImage(p) : null);
    const src = image && resolveTermsLink(image, {}, location.origin);
    if (src)
      row.append(
        element('img', {
          src,
          width: 96,
          height: 112,
          alt: '',
          class: 'checkout-product-image',
          loading: 'lazy',
        }),
      );
    const body = element('div', { class: 'checkout-item-body' }, element('h3', {}, displayTitle));
    const price = element('p', { class: 'checkout-unit-price' });
    body.append(price);
    const controls = element('div', { class: 'checkout-quantity' });
    const q = element('input', {
      name: Object.keys(selection.choices ?? {}).length ? selectionKey(selection) : selection.sku,
      type: 'number',
      min: 1,
      max: Math.min(100, p.available),
      step: 1,
      value: count,
      disabled: !count,
      inputmode: 'numeric',
      'aria-label': t[2] + ': ' + displayTitle,
    });
    fields[selectionKey(selection)] = q;
    const minus = element(
      'button',
      { type: 'button', 'aria-label': u.decrease + ': ' + displayTitle },
      '−',
    );
    const plus = element(
      'button',
      { type: 'button', 'aria-label': u.increase + ': ' + displayTitle },
      '+',
    );
    const remove = element(
      'button',
      {
        type: 'button',
        class: 'checkout-remove',
        'aria-label': u.remove + ': ' + displayTitle,
      },
      u.remove,
    );
    const change = (value) => {
      if (busy || lockedForOrder) return;
      q.value = String(value);
      if (value === 0) row.hidden = true;
      changed();
    };
    minus.addEventListener('click', () => change(Math.max(1, Number(q.value) - 1)));
    plus.addEventListener('click', () => change(Math.min(100, p.available, Number(q.value) + 1)));
    remove.addEventListener('click', () => change(0));
    controls.append(minus, q, plus);
    body.append(controls, remove);
    row.append(body);
    items.append(row);
    row.hidden = !count;
    return { p, selection, q, row, price, minus, plus, remove };
  });
  const line = (name) => {
    const row = element('div', {}, element('dt', {}, name), element('dd', {}));
    return { row, value: row.children[1] };
  };
  const couponInput = element('input', {
    id: 'checkout-discount-code',
    name: 'discountCode',
    type: 'text',
    maxlength: 40,
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: dc.placeholder,
    value: activeDiscountCode,
    'aria-describedby': 'checkout-discount-note',
  });
  fields.discountCode = couponInput;
  const couponApply = element('button', { type: 'button' }, dc.apply),
    couponRemove = element('button', { type: 'button', class: 'checkout-code-remove' }, dc.remove),
    couponNote = element('p', {
      id: 'checkout-discount-note',
      class: 'checkout-code-note',
      role: 'status',
      'aria-live': 'polite',
    });
  const couponGroup = element(
    'div',
    { class: 'checkout-code' },
    element('label', { for: 'checkout-discount-code' }, dc.code),
    element('div', { class: 'checkout-code-input' }, couponInput, couponApply),
    couponNote,
    couponRemove,
  );
  const sub = line(u.subtotal),
    discountLine = line(dc.discount),
    ship = line(u.shipping),
    total = line(u.total);
  const totals = element(
    'dl',
    { class: 'checkout-totals', 'aria-live': 'polite' },
    sub.row,
    discountLine.row,
    ship.row,
    total.row,
  );
  discountLine.row.className = 'checkout-discount-total';
  summary.append(couponGroup, totals);
  const terms = element('input', { name: 'terms', type: 'checkbox', required: true });
  fields.terms = terms;
  const termsLink = element('a', { target: '_blank', rel: 'noopener noreferrer' }, u.terms);
  summary.append(element('label', { class: 'checkout-consent' }, terms, termsLink));
  const termsUnavailable = element(
    'p',
    { class: 'checkout-hint', role: 'status' },
    {
      lt: 'Nepavyko patvirtinti galiojančių pirkimo sąlygų. Atnaujinkite puslapį arba susisiekite su mumis.',
      pl: 'Nie udało się potwierdzić aktualnych warunków zakupu. Odśwież stronę lub skontaktuj się z nami.',
      lv: 'Neizdevās apstiprināt aktuālos pirkuma noteikumus. Atsvaidziniet lapu vai sazinieties ar mums.',
      et: 'Kehtivaid ostutingimusi ei õnnestunud kinnitada. Värskendage lehte või võtke meiega ühendust.',
    }[language] ||
      'The current purchase terms could not be confirmed. Refresh the page or contact us.',
  );
  summary.append(termsUnavailable);
  const submit = element('button', { type: 'submit', class: 'checkout-submit' }, u.continue);
  const security = element('p', { class: 'checkout-security' }, u.payment);
  summary.append(submit, security, element('p', { class: 'checkout-hint' }, u.guest));
  const paymentPane = element('div', { class: 'checkout-payment checkout-payment-inline' });
  paymentPane.hidden = true;
  if (paymentPlacement === 'summary') summary.insertBefore(paymentPane, submit);
  else details.append(paymentPane);
  if (catalogueHref)
    summary.append(element('a', { class: 'checkout-continue', href: catalogueHref }, m.catalogue));
  form.append(details, summary);
  content.append(intro, closed, empty, form);
  const selectedQuantity = (sku, excluded) =>
    rows
      .filter((r) => r.p.sku === sku && r !== excluded && !r.row.hidden)
      .reduce((n, r) => n + Number(r.q.value), 0);
  const validQuantities = () =>
    rows.every(
      (r) =>
        r.row.hidden ||
        (Number.isInteger(Number(r.q.value)) &&
          Number(r.q.value) >= 1 &&
          selectedQuantity(r.p.sku) <= Math.min(100, r.p.available)),
    );
  const lines = () =>
    rows
      .filter((r) => !r.row.hidden && Number(r.q.value) > 0)
      .map(({ selection, q }) => ({ ...selection, quantity: Number(q.value) }));
  const customer = () => ({
    name: fields.name.value.trim(),
    email: fields.email.value.trim(),
    phone: fields.phone.value.trim(),
    address: {
      country: selectedCountry,
      line1: fields.line1.value.trim(),
      city: fields.city.value.trim(),
      postalCode: fields.postalCode.value.trim(),
    },
    ...(locker.required ? { lockerId: locker.value } : {}),
  });
  const proposal = () => ({
    country: selectedCountry,
    currency: market()?.currency,
    deliveryId: delivery.value,
    lines: lines(),
    customer: customer(),
    ...(activeDiscountCode ? { discountCode: activeDiscountCode } : {}),
  });
  const couponFingerprint = () =>
    JSON.stringify({ country: selectedCountry, currency: market()?.currency, lines: lines() });
  const currentCouponPreview = () =>
    couponPreview?.fingerprint === couponFingerprint() &&
    couponPreview.discount.code === activeDiscountCode
      ? couponPreview
      : undefined;
  const ready = () =>
    validQuantities() &&
    lines().length > 0 &&
    market()?.delivery.some((d) => d.id === delivery.value) &&
    ['name', 'email', 'phone', 'line1', 'city', 'postalCode'].every(
      (key) => fields[key].checkValidity?.() !== false,
    ) &&
    (!locker.required || Boolean(locker.value));
  const paint = () => {
    const preview = currentCouponPreview(),
      priceSource = quoted || preview,
      discountAmount = priceSource ? quoteDiscountAmount(priceSource) : 0;
    const isEmpty = !rows.some((r) => !r.row.hidden);
    empty.hidden = !isEmpty;
    form.hidden = isEmpty;
    intro.hidden = isEmpty;
    closed.hidden = isEmpty || canOrder;
    let cents = 0,
      valid = Boolean(lockedForOrder && quoted) || (validQuantities() && Boolean(market()));
    for (const currentRow of rows) {
      const { p, selection, q, row, price, minus, plus, remove } = currentRow;
      let configuredAmount;
      try {
        configuredAmount = resolveCatalogSelection(p, selectedCountry, selection.choices).amount;
      } catch {}
      const unit =
        priceSource?.lines?.find((l) => selectionKey(l) === selectionKey(selection))?.unitAmount ??
        configuredAmount;
      q.disabled = busy || lockedForOrder || row.hidden;
      price.textContent = Number.isSafeInteger(unit)
        ? money(unit, market()?.currency || 'EUR') + ' / ' + u.each
        : u.unknown;
      if (!row.hidden) {
        valid &&= Number.isSafeInteger(unit);
        cents += Number.isSafeInteger(unit) ? unit * Number(q.value) : 0;
      }
      minus.disabled = busy || lockedForOrder || Number(q.value) <= 1;
      const maxQuantity = Math.max(
        0,
        Math.min(100, p.available) - selectedQuantity(p.sku, currentRow),
      );
      q.max = String(maxQuantity);
      plus.disabled = busy || lockedForOrder || Number(q.value) >= maxQuantity;
      remove.disabled = busy || lockedForOrder;
    }
    sub.value.textContent = valid ? money(cents, market().currency) : u.unknown;
    discountLine.row.hidden = !discountAmount;
    discountLine.row.children[0].textContent =
      dc.discount + (priceSource?.discount ? ' (' + priceSource.discount.code + ')' : '');
    discountLine.value.textContent = '−' + money(discountAmount, market()?.currency || 'EUR');
    couponInput.disabled = busy || lockedForOrder;
    couponApply.disabled =
      busy || lockedForOrder || couponPending || !couponInput.value.trim() || isEmpty;
    couponRemove.disabled = busy || lockedForOrder || couponPending;
    couponRemove.hidden = lockedForOrder || (!activeDiscountCode && !couponInput.value);
    const freeShipping = priceSource?.discount?.freeShipping === true;
    ship.value.textContent = quoted
      ? money(quoted.delivery.amount, quoted.currency)
      : freeShipping
        ? money(0, market().currency)
        : u.calculated;
    total.value.textContent = quoted
      ? money(quoted.amount, quoted.currency)
      : valid
        ? money(cents - discountAmount, market().currency) +
          (freeShipping ? '' : ' + ' + u.shipping.toLocaleLowerCase(language))
        : u.unknown;
    submit.disabled =
      busy ||
      couponPending ||
      (Boolean(activeDiscountCode) && !priceSource?.discount) ||
      lockedForOrder ||
      isEmpty ||
      !valid ||
      !canOrder ||
      !termsLink.getAttribute?.('href') ||
      !market()?.delivery.length;
    submit.textContent = busy ? u.checking : u.continue;
    submit.hidden = lockedForOrder;
  };
  const invalidate = () => {
    version++;
    quoted = undefined;
    clearTimeout(timer);
    status.textContent = '';
    status.setAttribute('role', 'status');
    paint();
  };
  const getQuote = () => {
    if (pendingQuote?.version === version) return pendingQuote.promise;
    const expected = version,
      input = proposal(),
      method = market()?.delivery.find((d) => d.id === delivery.value);
    const pending = { version: expected };
    pendingQuote = pending;
    pending.promise = (async () => {
      const deliveryQuote =
        method?.pricing === 'carrier' ? await client.deliveryQuote(input) : null;
      if (signal?.aborted || version !== expected) throw new Error('quote_price_changed');
      const result = await client.quote({
        ...input,
        ...(deliveryQuote ? { deliveryQuoteId: deliveryQuote.id } : {}),
      });
      if (signal?.aborted || version !== expected) throw new Error('quote_price_changed');
      if (
        !Number.isSafeInteger(result.amount) ||
        result.amount < 0 ||
        result.currency !== input.currency ||
        !result.quoteHash ||
        !Number.isSafeInteger(result.delivery?.amount) ||
        result.delivery.amount < 0 ||
        !Array.isArray(result.lines) ||
        result.lines.length !== input.lines.length ||
        input.lines.some(
          (l) =>
            !result.lines.some(
              (r) =>
                selectionKey(r) === selectionKey(l) &&
                r.quantity === l.quantity &&
                Number.isSafeInteger(r.unitAmount) &&
                r.unitAmount >= 0,
            ),
        ) ||
        Boolean(input.discountCode) !== Boolean(result.discount) ||
        (input.discountCode && result.discount?.code !== input.discountCode) ||
        result.lines.reduce((sum, l) => sum + l.unitAmount * l.quantity, 0) -
          quoteDiscountAmount(result) +
          result.delivery.amount !==
          result.amount
      )
        throw new Error('invalid_quote');
      quoted = { ...result, ...(deliveryQuote ? { deliveryQuoteId: deliveryQuote.id } : {}) };
      paint();
      return quoted;
    })()
      .catch((error) => {
        if (!signal?.aborted && version === expected) rejectCoupon(error);
        throw error;
      })
      .finally(() => {
        // A stale address response must not clear a newer address's pending quote.
        if (pendingQuote === pending) pendingQuote = undefined;
      });
    return pending.promise;
  };
  const deliveryFailed = (error) =>
    [
      'commerce_connection_failed',
      'carrier_pacing_busy',
      'carrier_transport_failed',
      'carrier_request_failed',
      'carrier_rate_limited',
    ].includes(error.message);
  const changed = () => {
    const count = lines().reduce((sum, l) => sum + l.quantity, 0);
    for (const option of delivery.options) {
      const method = market()?.delivery.find((d) => d.id === option.value);
      option.disabled = Boolean(
        method?.customerCharge !== 'single_parcel' &&
        method?.maxParcels &&
        count > method.maxParcels,
      );
    }
    lockerHint.hidden =
      count <= 1 ||
      !market()?.delivery.some((d) => d.kind === 'locker' && d.customerCharge !== 'single_parcel');
    if (Array.from(delivery.options).find((o) => o.value === delivery.value)?.disabled) {
      delivery.value = Array.from(delivery.options).find((o) => !o.disabled)?.value || '';
      refreshLocker();
      return;
    }
    if (busy || lockedForOrder) return;
    invalidate();
    queueCouponPreview();
    if (validQuantities()) {
      const next = lines(),
        serialized = JSON.stringify(next);
      if (serialized !== lastCart) {
        lastCart = serialized;
        emitCart(next);
      }
    }
    if (ready()) {
      const expected = version;
      timer = setTimeout(() => {
        status.textContent = u.checking;
        status.setAttribute('role', 'status');
        getQuote()
          .then(() => {
            if (version === expected && !busy) status.textContent = '';
          })
          .catch((error) => {
            if (!signal?.aborted && version === expected && !busy) {
              status.textContent = error.message.startsWith('discount_')
                ? couponFailure(error)
                : deliveryFailed(error)
                  ? u.deliveryUnavailable
                  : u.quoteError;
              status.setAttribute('role', 'alert');
            }
          });
      }, 650);
    }
    timer?.unref?.();
  };
  const couponFailure = (error) =>
    error.message === 'discount_basket_too_small'
      ? dc.paymentMinimum
      : error.message === 'discount_minimum_not_met'
        ? dc.minimum
        : ['network', 'commerce_connection_failed', 'discount_connection_failed'].includes(
              error.message,
            )
          ? dc.network
          : dc.invalid;
  const rejectCoupon = (error) => {
    if (
      !activeDiscountCode ||
      (!error.message.startsWith('discount_') && error.message !== 'quote_price_changed')
    )
      return;
    couponTicket++;
    clearTimeout(couponTimer);
    couponPending = false;
    couponPreview = undefined;
    quoted = undefined;
    couponLastAttempt = '';
    couponNote.textContent =
      error.message === 'quote_price_changed' ? u.quoteError : couponFailure(error);
    couponNote.setAttribute('role', 'alert');
    paint();
  };
  const requestCoupon = async (code, commit = false) => {
    const fingerprint = couponFingerprint(),
      ticket = ++couponTicket;
    couponLastAttempt = code + '|' + fingerprint;
    couponPending = true;
    couponNote.textContent = dc.checking;
    couponNote.setAttribute('role', 'status');
    paint();
    try {
      const result = await client.discountPreview({
        country: selectedCountry,
        currency: market()?.currency,
        lines: lines(),
        code,
      });
      if (
        signal?.aborted ||
        lockedForOrder ||
        ticket !== couponTicket ||
        fingerprint !== couponFingerprint()
      )
        return;
      if (
        !result ||
        result.currency !== market()?.currency ||
        result.discount?.code !== code ||
        !Array.isArray(result.lines) ||
        result.lines.length !== lines().length ||
        lines().some(
          (l) =>
            !result.lines.some(
              (r) =>
                selectionKey(l) === selectionKey(r) &&
                l.quantity === r.quantity &&
                Number.isSafeInteger(r.unitAmount) &&
                r.unitAmount > 0,
            ),
        ) ||
        result.subtotal !== result.lines.reduce((n, l) => n + l.unitAmount * l.quantity, 0) ||
        result.amount !== result.subtotal - quoteDiscountAmount(result)
      )
        throw new Error('invalid_quote');
      activeDiscountCode = code;
      couponInput.value = code;
      couponPreview = { ...result, fingerprint };
      couponNote.textContent =
        dc.applied + (result.discount.freeShipping ? ' ' + dc.freeShipping + '.' : '');
      couponNote.setAttribute('role', 'status');
      if (commit) changed();
      else paint();
    } catch (error) {
      if (
        signal?.aborted ||
        lockedForOrder ||
        ticket !== couponTicket ||
        fingerprint !== couponFingerprint()
      )
        return;
      couponPreview = undefined;
      couponNote.textContent = couponFailure(error);
      couponNote.setAttribute('role', 'alert');
    } finally {
      if (ticket === couponTicket) {
        couponPending = false;
        paint();
      }
    }
  };
  const queueCouponPreview = () => {
    clearTimeout(couponTimer);
    if (!activeDiscountCode || !lines().length) return;
    const fingerprint = couponFingerprint();
    if (couponLastAttempt === activeDiscountCode + '|' + fingerprint) return;
    couponTimer = setTimeout(() => requestCoupon(activeDiscountCode), 300);
    couponTimer?.unref?.();
  };
  const applyCoupon = () => {
    if (busy || lockedForOrder || couponPending || !lines().length) return;
    const code = couponInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]{2,39}$/.test(code)) {
      couponNote.textContent = dc.invalid;
      couponNote.setAttribute('role', 'alert');
      return;
    }
    return requestCoupon(code, true);
  };
  couponApply.addEventListener('click', applyCoupon);
  couponInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      applyCoupon();
    }
  });
  const clearCoupon = () => {
    couponTicket++;
    clearTimeout(couponTimer);
    couponPending = false;
    activeDiscountCode = '';
    couponPreview = undefined;
    couponLastAttempt = '';
    couponNote.textContent = '';
    couponNote.setAttribute('role', 'status');
  };
  couponInput.addEventListener('input', () => {
    if (busy || lockedForOrder) return;
    clearCoupon();
    changed();
  });
  couponRemove.addEventListener('click', () => {
    if (busy || lockedForOrder) return;
    clearCoupon();
    couponInput.value = '';
    changed();
    couponInput.focus?.();
  });
  signal?.addEventListener(
    'abort',
    () => {
      couponTicket++;
      clearTimeout(couponTimer);
    },
    { once: true },
  );
  const updateLockerAddress = () => {
    const method = market()?.delivery.find((d) => d.id === delivery.value),
      isLocker = method?.kind === 'locker';
    if (isLocker && !savedDoorAddress)
      savedDoorAddress = Object.fromEntries(
        ['line1', 'city', 'postalCode'].map((k) => [k, fields[k].value]),
      );
    const point = method?.lockers?.find((l) => l.id === locker.value);
    for (const key of ['line1', 'city', 'postalCode']) {
      fields[key].required = !isLocker;
      fields[key].parentElement.hidden = isLocker;
      if (isLocker) fields[key].value = point?.[key === 'line1' ? 'address' : key] || '';
      else if (savedDoorAddress) fields[key].value = savedDoorAddress[key];
    }
    if (!isLocker) savedDoorAddress = null;
  };
  const closeLockers = () => {
    lockerResults.hidden = true;
    lockerActive = -1;
    lockerSearch.setAttribute('aria-expanded', 'false');
    lockerSearch.removeAttribute('aria-activedescendant');
  };
  const syncLockerSelection = () => {
    const point = market()
      ?.delivery.find((d) => d.id === delivery.value)
      ?.lockers?.find((l) => l.id === locker.value);
    locker.value = point?.id || '';
    lockerSearch.value = point?.label || '';
    lockerStatus.textContent = point ? lockerCopy.selected + point.label : '';
    lockerSearch.setCustomValidity?.(locker.required && !point ? lockerCopy.choose : '');
    closeLockers();
    updateLockerAddress();
  };
  const chooseLocker = (id) => {
    if (busy || lockedForOrder) return;
    const point = market()
      ?.delivery.find((d) => d.id === delivery.value)
      ?.lockers?.find((l) => l.id === id);
    if (!point || !locker.required) return;
    locker.value = point.id;
    syncLockerSelection();
    changed();
    lockerSearch.focus?.({ preventScroll: true });
  };
  const showLockers = () => {
    if (busy || lockedForOrder || !locker.required) return closeLockers();
    const fold = (value) =>
      value
        .toLocaleLowerCase(language)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const words = fold(lockerSearch.value.trim()).split(/\s+/).filter(Boolean);
    const all = market()?.delivery.find((d) => d.id === delivery.value)?.lockers || [];
    const matches = all.filter((item) => {
      const text = fold(item.label + ' ' + (item.city || '') + ' ' + (item.address || ''));
      return words.every((word) => text.includes(word));
    });
    lockerMatches = matches.slice(0, 12);
    lockerActive = -1;
    lockerSearch.removeAttribute('aria-activedescendant');
    lockerResults.replaceChildren();
    for (const [index, item] of lockerMatches.entries()) {
      const option = element(
        'button',
        {
          type: 'button',
          role: 'option',
          tabindex: '-1',
          id: 'checkout-locker-option-' + index,
          class: 'checkout-locker-option',
          'aria-selected': 'false',
        },
        item.label,
      );
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => chooseLocker(item.id));
      lockerResults.append(option);
    }
    lockerResults.hidden = !lockerMatches.length;
    lockerSearch.setAttribute('aria-expanded', String(Boolean(lockerMatches.length)));
    lockerStatus.textContent = !matches.length
      ? lockerCopy.empty
      : matches.length > lockerMatches.length
        ? lockerCopy.more
        : '';
  };
  lockerSearch.addEventListener('input', () => {
    if (busy || lockedForOrder) return;
    locker.value = '';
    lockerSearch.setCustomValidity?.(lockerCopy.choose);
    updateLockerAddress();
    showLockers();
    changed();
  });
  lockerSearch.addEventListener('focus', () => {
    if (!locker.value) showLockers();
  });
  lockerChooser.addEventListener('focusout', (event) => {
    if (!lockerChooser.contains?.(event.relatedTarget)) closeLockers();
  });
  lockerSearch.addEventListener('keydown', (event) => {
    if (busy || lockedForOrder) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeLockers();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!lockerResults.hidden && (lockerActive >= 0 || lockerMatches.length === 1))
        chooseLocker(lockerMatches[Math.max(0, lockerActive)].id);
      return;
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    if (lockerResults.hidden) showLockers();
    if (!lockerMatches.length) return;
    lockerActive =
      (lockerActive +
        (event.key === 'ArrowDown' ? 1 : lockerActive < 0 ? 0 : -1) +
        lockerMatches.length) %
      lockerMatches.length;
    for (const [index, option] of Array.from(lockerResults.children).entries())
      option.setAttribute('aria-selected', String(index === lockerActive));
    lockerSearch.setAttribute('aria-activedescendant', 'checkout-locker-option-' + lockerActive);
    lockerResults.children[lockerActive]?.scrollIntoView?.({ block: 'nearest' });
  });
  locker.addEventListener('change', () => {
    syncLockerSelection();
    changed();
  });
  const refreshLocker = () => {
    const method = market()?.delivery.find((d) => d.id === delivery.value);
    locker.required = method?.kind === 'locker';
    locker.value = '';
    lockerChooser.hidden = !locker.required;
    lockerSearch.required = locker.required;
    lockerSearch.disabled = !locker.required;
    syncLockerSelection();
    changed();
  };
  const refresh = () => {
    selectedCountry = countrySelect.value;
    delivery.replaceChildren();
    for (const method of market()?.delivery || [])
      delivery.append(
        element(
          'option',
          { value: method.id },
          method.label +
            (method.pricing === 'carrier' ? '' : ' · ' + money(method.amount, market().currency)),
        ),
      );
    noDelivery.hidden = Boolean(delivery.options.length);
    delivery.disabled = !delivery.options.length;
    const href =
      market() &&
      resolveTermsLink(
        termsUrl,
        { country: selectedCountry, language, policyVersion: market().policyVersion },
        location.origin,
      );
    if (href) termsLink.setAttribute('href', href);
    else termsLink.removeAttribute('href');
    terms.disabled = !href;
    termsUnavailable.hidden = Boolean(href);
    terms.checked = false;
    fields.postalCode.pattern =
      { LT: '(LT-)?[0-9]{5}', PL: '[0-9]{2}-[0-9]{3}', LV: '(LV-)?[0-9]{4}', EE: '[0-9]{5}' }[
        selectedCountry
      ] || '.+';
    refreshLocker();
  };
  let paymentMounting = false,
    paymentMounted = false;
  const active = () => !signal?.aborted && isCurrent();
  const lockOrder = () => {
    lockedForOrder = true;
    closeLockers();
    clearTimeout(timer);
    clearTimeout(couponTimer);
    couponTicket++;
    couponPending = false;
    for (const field of Object.values(fields)) field.disabled = true;
    paint();
  };
  const enterPayment = async (order) => {
    if (!renderPayment) return finish(order);
    lockOrder();
    paymentPane.hidden = false;
    if (paymentMounting || paymentMounted || !active()) return;
    paymentMounting = true;
    const controls = element('div', { class: 'checkout-inline-actions' });
    const action = (label, task) => {
      const button = element('button', { type: 'button' }, label);
      button.addEventListener('click', async () => {
        if (button.disabled || !active()) return;
        button.disabled = true;
        try {
          await task();
        } catch {
          if (active()) {
            status.textContent = t[30];
            status.setAttribute('role', 'alert');
          }
        } finally {
          button.disabled = false;
        }
      });
      controls.append(button);
      return button;
    };
    const complete = async () => {
      const current = await resumeOrder();
      if (!active()) return;
      if (current.payment_state !== 'pending' || current.stock_state !== 'reserved')
        await finish(current);
      else {
        status.textContent = t[22];
        status.setAttribute('role', 'status');
      }
    };
    try {
      const clean = await renderPayment({
        target: paymentPane,
        client,
        order,
        onComplete: complete,
        signal,
      });
      if (!active()) {
        clean?.();
        return;
      }
      setPaymentCleanup(typeof clean === 'function' ? clean : () => {});
      paymentMounted = true;
      status.textContent = '';
      status.setAttribute('role', 'status');
    } catch {
      if (!active()) return;
      status.textContent = t[30];
      status.setAttribute('role', 'alert');
      action(t[15], () => enterPayment(order));
    } finally {
      paymentMounting = false;
    }
    if (!active()) return;
    action(t[16], complete);
    if (!client.attempt?.recovery)
      action(t[17], async () => {
        await client.withdrawal();
        if (active()) status.textContent = t[28];
      });
    action(t[18], restart);
    paymentPane.append(controls);
  };
  form.addEventListener('input', (event) => {
    if (event.target !== terms && event.target !== couponInput && event.target !== lockerSearch)
      changed();
  });
  countrySelect.addEventListener('change', refresh);
  delivery.addEventListener('change', refreshLocker);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (
      busy ||
      couponPending ||
      lockedForOrder ||
      !canOrder ||
      !ready() ||
      terms.disabled ||
      !termsLink.getAttribute('href') ||
      !terms.checked ||
      !form.reportValidity()
    )
      return;
    const input = proposal(),
      policyVersion = market().policyVersion;
    const locked = Object.values(fields).map((f) => [f, f.disabled]);
    busy = true;
    closeLockers();
    clearTimeout(timer);
    for (const [f] of locked) f.disabled = true;
    paint();
    status.textContent = u.checking;
    status.setAttribute('role', 'status');
    try {
      const quote = quoted || (await getQuote());
      if (signal?.aborted) return;
      const order = await client.create({
        ...input,
        quoteHash: quote.quoteHash,
        ...(quote.deliveryQuoteId ? { deliveryQuoteId: quote.deliveryQuoteId } : {}),
        acceptedPolicyVersion: policyVersion,
        ...(context.paymentRecovery
          ? { paymentRecoveryNotice: context.paymentRecovery.noticeVersion }
          : {}),
      });
      if (signal?.aborted) return;
      emitCart([]);
      await enterPayment(order);
    } catch (error) {
      if (!signal?.aborted) {
        rejectCoupon(error);
        status.textContent = deliveryFailed(error)
          ? u.deliveryUnavailable
          : error.message === 'network'
            ? t[30]
            : error.message.startsWith('discount_')
              ? couponFailure(error)
              : ['stock_unavailable', 'product_unavailable'].includes(error.message)
                ? u.unavailable
                : ['quote_price_changed', 'delivery_quote_conflict'].includes(error.message)
                  ? u.quoteError
                  : t[29];
        status.setAttribute('role', 'alert');
        status.focus?.({ preventScroll: true });
      }
      if (!client.attempt && !lockedForOrder) quoted = undefined;
      if (client.attempt && !signal?.aborted) {
        lockOrder();
        paymentPane.hidden = false;
        const retry = element('button', { type: 'button', class: 'checkout-submit' }, t[16]);
        retry.addEventListener('click', async () => {
          retry.disabled = true;
          try {
            const order = await client.resume();
            if (order && !signal?.aborted) {
              emitCart([]);
              await enterPayment(order);
              status.textContent = '';
            }
          } catch {
            status.textContent = t[30];
            status.setAttribute('role', 'alert');
          } finally {
            retry.disabled = false;
          }
        });
        paymentPane.replaceChildren(element('p', {}, t[30]), retry);
      }
    } finally {
      if (!lockedForOrder) for (const [f, disabled] of locked) f.disabled = disabled;
      busy = false;
      if (!signal?.aborted) paint();
    }
  });
  signal?.addEventListener('abort', () => clearTimeout(timer), { once: true });
  refresh();
  const prefill = initialOrder || restoredOrder;
  if (prefill) {
    const saved = prefill.snapshot.customer,
      address = saved.address;
    for (const [key, value] of Object.entries({
      name: saved.contactName || saved.name,
      email: saved.email,
      phone: saved.phone,
      line1: address.line1,
      city: address.city,
      postalCode: address.postalCode,
    }))
      fields[key].value = value || '';
    delivery.value = prefill.snapshot.delivery.id;
    refreshLocker();
    if (saved.lockerId) {
      locker.value = saved.lockerId;
      syncLockerSelection();
    }
    terms.checked = Boolean(initialOrder);
    if (!initialOrder) {
      changed();
      status.textContent =
        'Pasirinktos prekės ir pristatymo duomenys atkurti. Patikrinkite naują sumą ir pristatymą, tada tęskite apmokėjimą.';
      return;
    }
    quoted = {
      amount: initialOrder.amount,
      currency: initialOrder.currency,
      lines: initialOrder.snapshot.lines,
      delivery: initialOrder.snapshot.delivery,
      ...(initialOrder.snapshot.discount ? { discount: initialOrder.snapshot.discount } : {}),
    };
    return enterPayment(initialOrder);
  }
}
/**
 * @param {HTMLElement} root
 * @param {{language?:string,country?:string,client?:CommerceClient,termsUrl?:string|((context:{country:string,language:string,policyVersion:string})=>string|null),catalogueUrl?:string,initialLines?:Array<{sku:string,quantity:number}>,onCartChange?:(lines:Array<{sku:string,quantity:number}>)=>void,headingLevel?:number,title?:string,productTitle?:(product:any,language:string)=>string,layout?:'classic'|'one-page',productsPlacement?:'details'|'summary',paymentPlacement?:'details'|'summary',recoveryToken?:string,productImage?:(product:any)=>string|null,renderPayment?:(context:{target:HTMLElement,client:CommerceClient,order:any,onComplete:()=>Promise<void>,signal?:AbortSignal})=>Promise<void|(()=>void)>,signal?:AbortSignal}} options
 */
export async function mountCheckout(
  root,
  {
    language = 'lt',
    country = 'LT',
    client = new CommerceClient(),
    termsUrl = '/pirkimo-taisykles',
    catalogueUrl,
    initialLines = [],
    onCartChange,
    headingLevel = 1,
    title,
    productTitle = (product, language) =>
      product.titles?.[{ lt: 'LT', pl: 'PL', lv: 'LV', et: 'EE' }[language]] || product.title,
    layout = 'classic',
    productsPlacement = 'details',
    paymentPlacement = 'details',
    productImage,
    renderPayment,
    signal,
    recoveryToken,
  } = {},
) {
  const t = translations[language] || translations.lt;
  const m = buyerMessages[language] || buyerMessages.lt;
  const status = element('p', { role: 'status', 'aria-live': 'polite' });
  const content = element('div');
  const money = (amount, currency) =>
    new Intl.NumberFormat(language, { style: 'currency', currency }).format(amount / 100);
  const run = async (button, task) => {
    button.disabled = true;
    root.setAttribute('aria-busy', 'true');
    status.setAttribute('role', 'status');
    status.textContent = '…';
    try {
      await task();
    } catch (error) {
      status.textContent = [
        'quote_price_changed',
        'delivery_quote_conflict',
        'terms_acceptance_required',
      ].includes(error.message)
        ? t[32]
        : error.message === 'network'
          ? t[30]
          : t[29];
      status.setAttribute('role', 'alert');
    } finally {
      button.disabled = false;
      root.setAttribute('aria-busy', 'false');
    }
  };
  const { context, catalog, markets } = await client.initialize();
  if (signal?.aborted) return client;
  // Keep the caller's loading/status shell until data is ready. An aborted
  // initialization must not replace a newer view or collapse its geometry.
  root.replaceChildren(
    ...(Number.isInteger(headingLevel) && headingLevel >= 1 && headingLevel <= 6
      ? [element('h' + headingLevel, {}, title || t[0])]
      : []),
    status,
    content,
  );
  let recovered;
  if (recoveryToken) recovered = await client.openRecovery(recoveryToken);
  else if (client.attempt?.recovery) recovered = await client.openRecovery(client.attempt.token);
  let cartLines = normalizeCheckoutCart(initialLines, catalog);
  const emitCart = (next = cartLines) => {
    cartLines = normalizeCheckoutCart(next, catalog);
    if (typeof onCartChange !== 'function') return;
    try {
      onCartChange(cartLines.map((line) => ({ ...line })));
    } catch {
      // A caller's cart-storage failure must not hide an already created order.
      console.warn('Commerce cart callback failed');
    }
  };
  if (recovered?.state === 'restore') emitCart(recovered.order.snapshot.lines);
  if (recovered?.state === 'unavailable') {
    status.textContent =
      'Šio užsakymo apmokėjimo tęsti nebegalima. Jei jau pateikėte kitą užsakymą, tikrinkite jo būseną. Jei reikia pagalbos, susisiekite su parduotuve.';
    return client;
  }
  const clearCart = () => {
    cartLines = [];
    emitCart();
  };
  const resumeOrder = async (clearCreatedCart = false) => {
    const pendingCreate = Boolean(client.attempt && !client.attempt.orderId);
    const order = await client.resume();
    if (order) {
      const orderedLines = normalizeCheckoutCart(order.snapshot.lines, catalog);
      const sameCart =
        cartLines.length === orderedLines.length &&
        cartLines.every((line) =>
          orderedLines.some(
            (ordered) =>
              selectionKey(ordered) === selectionKey(line) && ordered.quantity === line.quantity,
          ),
        );
      if (clearCreatedCart || (pendingCreate && sameCart)) clearCart();
    }
    return order;
  };
  if (context.environment === 'sandbox' || (layout !== 'one-page' && !context.productionReady))
    root.insertBefore(element('p', {}, context.environment === 'sandbox' ? t[19] : t[20]), status);
  let disposePayment = () => {},
    viewVersion = 0;
  signal?.addEventListener('abort', () => disposePayment(), { once: true });
  const orderView = async (order, openPayment = false) => {
    const currentView = ++viewVersion;
    disposePayment();
    disposePayment = () => {};
    content.replaceChildren();
    content.setAttribute('class', 'checkout-order');
    const states = {
      pending: t[22],
      paid: t[23],
      partially_refunded: t[24],
      refunded: t[25],
      failed: t[26],
    };
    content.append(
      element('p', {}, t[27] + ': ' + order.id.slice(0, 8).toUpperCase()),
      element(
        'p',
        {},
        order.payment_state === 'pending' && order.stock_state === 'released'
          ? m.unpaid
          : states[order.payment_state] || order.payment_state,
      ),
      element('p', {}, t[21] + ': ' + money(order.amount, order.currency)),
    );
    for (const line of order.snapshot.lines)
      content.append(element('p', {}, productTitle({ ...line }, language) + ' × ' + line.quantity));
    if (order.snapshot.discount)
      content.append(
        element(
          'p',
          {},
          (discountMessages[language] || discountMessages.lt).discount +
            ' (' +
            order.snapshot.discount.code +
            '): −' +
            money(order.snapshot.discount.amount, order.currency),
        ),
      );
    if (order.snapshot.discount?.freeShipping)
      content.append(
        element('p', {}, (discountMessages[language] || discountMessages.lt).freeShipping),
      );
    if (order.payment_state === 'pending' && order.stock_state === 'released')
      content.append(element('p', { role: 'status' }, m.expired));
    if (
      order.payment_state === 'pending' &&
      order.stock_state === 'reserved' &&
      !context.paymentConnected
    )
      content.append(element('p', { role: 'status' }, m.paymentOff));
    const customer = order.snapshot.customer,
      address = customer?.address;
    if (address || order.snapshot.country || order.snapshot.delivery?.label) {
      content.append(element('h2', {}, m.delivery));
      for (const value of [
        customer?.contactName || customer?.name,
        customer?.email,
        customer?.phone,
        address?.line1,
        address?.line2,
        [address?.postalCode, address?.city, address?.country || order.snapshot.country]
          .filter(Boolean)
          .join(' · '),
        order.snapshot.delivery?.label,
        customer?.locker?.label || customer?.locker?.id,
      ])
        if (typeof value === 'string' && value) content.append(element('p', {}, value));
    }
    const buttons = element('div', { class: 'actions' });
    const add = (label, task) => {
      const b = element('button', { type: 'button' }, label);
      b.addEventListener('click', () => run(b, task));
      buttons.append(b);
      return b;
    };
    let startPayment;
    if (
      order.payment_state === 'pending' &&
      order.stock_state === 'reserved' &&
      client.recoveryState !== 'processing'
    ) {
      const pane = element('div', { class: 'checkout-payment' });
      let mounting = false,
        mounted = false;
      startPayment = async () => {
        if (mounting || mounted || signal?.aborted) return;
        mounting = true;
        pay.disabled = true;
        try {
          if (!renderPayment) {
            location.assign(await client.checkout());
            return;
          }
          disposePayment();
          pane.replaceChildren();
          pane.hidden = false;
          const clean = await renderPayment({
            target: pane,
            client,
            order,
            onComplete: async () => {
              if (!signal?.aborted) await orderView(await resumeOrder());
            },
            signal,
          });
          if (signal?.aborted || currentView !== viewVersion) {
            clean?.();
            return;
          }
          disposePayment = typeof clean === 'function' ? clean : () => {};
          mounted = true;
        } finally {
          mounting = false;
          pay.disabled =
            mounted ||
            !context.paymentConnected ||
            !(context.productionReady || context.canCreateTestOrder);
        }
      };
      const pay = add(t[15], startPayment);
      pay.disabled =
        !context.paymentConnected || !(context.productionReady || context.canCreateTestOrder);
      if (renderPayment) {
        pane.hidden = true;
        content.append(pane);
      }
    }
    add(t[16], async () => {
      await orderView(await resumeOrder());
      status.textContent = '';
    });
    if (!client.attempt?.recovery)
      add(t[17], async () => {
        await client.withdrawal();
        status.textContent = t[28];
      });
    if (client.recoveryState === 'processing')
      content.append(
        element(
          'p',
          { role: 'status' },
          'Mokėjimo būsena tikrinama. Naujo mokėjimo nepradėkite. Atnaujinkite būseną po kelių minučių.',
        ),
      );
    add(t[18], async () => {
      client.newOrder();
      formView();
      status.textContent = '';
    });
    content.append(buttons);
    const receipt = await client.receipt();
    if (receipt.withdrawalRequested) content.append(element('p', { role: 'status' }, t[28]));
    if (receipt.fulfillmentBlocked || order.fulfillment_state === 'stock_exception')
      content.append(element('p', { role: 'status' }, m.held));
    if (order.fulfillment_state === 'canceled')
      content.append(element('p', { role: 'status' }, m.canceled));
    if (order.fulfillment_state === 'return_received')
      content.append(element('p', { role: 'status' }, m.returned));
    if (receipt.documents?.length && !client.attempt?.recovery) {
      content.append(element('h2', {}, t[33]));
      for (const doc of receipt.documents.filter((d) => ['sale', 'credit'].includes(d.kind))) {
        const download = element('button', { type: 'button' }, doc.number + '.pdf');
        download.addEventListener('click', () =>
          run(download, async () => {
            const blob = await client.document(doc.id),
              url = URL.createObjectURL(blob);
            element('a', { href: url, download: doc.number + '.pdf' }).click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = '';
          }),
        );
        content.append(element('p', {}, download));
      }
    }
    if (receipt.shipment)
      content.append(
        element('p', {}, t[34] + ': ' + (receipt.shipment.tracking || receipt.shipment.state)),
      );
    for (const event of receipt.tracking || [])
      content.append(
        element(
          'p',
          {},
          [event.providerDate, event.text, event.location].filter(Boolean).join(' · '),
        ),
      );
    if (
      openPayment &&
      startPayment &&
      context.paymentConnected &&
      (context.productionReady || context.canCreateTestOrder)
    )
      await startPayment();
  };
  const formView = (initialOrder, restoredOrder) => {
    const currentView = ++viewVersion;
    disposePayment();
    disposePayment = () => {};
    content.replaceChildren();
    status.textContent = '';
    content.setAttribute('class', 'checkout-content');
    if (layout === 'one-page') {
      return onePageForm({
        content,
        status,
        client,
        context,
        catalog,
        markets: markets.filter((market) => market.checkoutEnabled !== false),
        cartLines: initialOrder ? initialOrder.snapshot.lines : cartLines,
        country: (initialOrder || restoredOrder)?.snapshot.country || country,
        language,
        t,
        m,
        money,
        termsUrl,
        catalogueUrl,
        productTitle,
        productImage,
        productsPlacement,
        paymentPlacement,
        embeddedPayment: typeof renderPayment === 'function',
        emitCart,
        finish: (order) => orderView(order, true),
        renderPayment,
        resumeOrder,
        restart: () => {
          client.newOrder();
          formView();
          status.textContent = '';
        },
        setPaymentCleanup: (clean) => {
          disposePayment();
          disposePayment = clean;
        },
        isCurrent: () => currentView === viewVersion,
        initialOrder,
        restoredOrder,
        signal,
      });
      return;
    }
    const form = element('form', { class: 'checkout-form' }),
      fields = {};
    if (context.paymentRecovery && language === 'lt')
      form.append(
        element(
          'p',
          { class: 'checkout-hint' },
          `Neužbaigus apmokėjimo, po ${context.paymentRecovery.reminderAfterHours} val. atsiųsime vieną priminimą el. paštu. Užsakymą galima apmokėti per ${context.paymentRecovery.reservationHours} val. Daugiau priminimų nesiųsime.`,
        ),
      );
    const field = (name, label, attrs = {}, tag = 'input') => {
      const input = element(tag, { name, id: 'checkout-' + name, ...attrs });
      fields[name] = input;
      form.append(element('label', { for: 'checkout-' + name }, label, input));
      return input;
    };
    const productInputs = catalog
      .filter((p) => p.enabled !== false)
      .map((p) => {
        const q = field(p.sku, productTitle(p, language), {
          type: 'number',
          min: '0',
          max: Math.min(100, p.available),
          value: String(
            cartLines.find(
              (l) =>
                l.sku === p.sku &&
                Number.isInteger(l.quantity) &&
                l.quantity >= 0 &&
                l.quantity <= 100,
            )?.quantity || 0,
          ),
          inputmode: 'numeric',
        });
        return { p, q };
      });
    const marketSelect = field('country', t[3], {}, 'select');
    for (const m of markets)
      marketSelect.append(element('option', { value: m.country }, m.country));
    if (markets.some((m) => m.country === country)) marketSelect.value = country;
    const delivery = field('delivery', t[4], { required: true }, 'select');
    const locker = field('locker', t[11], {}, 'select');
    field('name', t[5], { required: true, minlength: '2', maxlength: '120', autocomplete: 'name' });
    field('email', t[6], {
      required: true,
      type: 'email',
      maxlength: '254',
      autocomplete: 'email',
    });
    field('phone', t[7], {
      required: true,
      type: 'tel',
      pattern: '\\+[1-9][0-9]{6,14}',
      autocomplete: 'tel',
    });
    field('line1', t[8], {
      required: true,
      minlength: '2',
      maxlength: '150',
      autocomplete: 'street-address',
    });
    field('city', t[9], { required: true, maxlength: '100', autocomplete: 'address-level2' });
    field('postalCode', t[10], { required: true, maxlength: '20', autocomplete: 'postal-code' });
    const terms = field('terms', t[12], { type: 'checkbox', required: true });
    const termsLink = element('a', {}, t[12]);
    form.append(termsLink);
    const quoteButton = element('button', { type: 'button' }, t[13]),
      submit = element('button', { type: 'submit', disabled: true }, t[14]);
    const summary = element('p', { role: 'status' });
    const emptyMessage = element('div', {}, element('p', { role: 'status' }, m.empty));
    const catalogueHref =
      typeof catalogueUrl === 'string' && resolveTermsLink(catalogueUrl, {}, location.origin);
    if (catalogueHref) emptyMessage.append(element('a', { href: catalogueHref }, m.catalogue));
    form.insertBefore(emptyMessage, form.children[0]);
    const cartEmpty = () => !productInputs.some(({ q }) => Number(q.value) > 0);
    let quoteBusy = false;
    const refreshEmpty = () => {
      emptyMessage.hidden = !cartEmpty();
      quoteButton.disabled = quoteBusy || cartEmpty();
    };
    let quoted,
      deliveryQuoteId,
      quoteVersion = 0,
      termsAvailable = false;
    const invalidateQuote = () => {
      quoteVersion++;
      quoted = undefined;
      deliveryQuoteId = undefined;
      submit.disabled = true;
      summary.textContent = t[32];
      refreshEmpty();
    };
    const selected = () => markets.find((m) => m.country === marketSelect.value);
    const refreshTerms = () => {
      const market = selected();
      const href =
        market &&
        resolveTermsLink(
          termsUrl,
          { country: market.country, language, policyVersion: market.policyVersion },
          location.origin,
        );
      termsAvailable = Boolean(href);
      terms.checked = false;
      terms.disabled = !termsAvailable;
      termsLink.hidden = !termsAvailable;
      if (href) termsLink.setAttribute('href', href);
      else termsLink.removeAttribute('href');
      submit.disabled = true;
    };
    const refreshLockers = () => {
      invalidateQuote();
      locker.replaceChildren();
      const method = selected()?.delivery.find((d) => d.id === delivery.value);
      for (const l of method?.lockers || [])
        locker.append(element('option', { value: l.id }, l.label));
      locker.parentElement.hidden = method?.kind !== 'locker';
      locker.required = method?.kind === 'locker';
    };
    const refresh = () => {
      delivery.replaceChildren();
      for (const d of selected()?.delivery || [])
        delivery.append(
          element(
            'option',
            { value: d.id },
            d.label +
              ' · ' +
              (d.pricing === 'carrier'
                ? {
                    lt: 'Kaina pagal adresą',
                    pl: 'Cena według adresu',
                    lv: 'Cena pēc adreses',
                    et: 'Hind aadressi järgi',
                  }[language] || 'Price by address'
                : money(d.amount, selected().currency)),
          ),
        );
      fields.postalCode.pattern =
        { LT: '(LT-)?[0-9]{5}', PL: '[0-9]{2}-[0-9]{3}', LV: '(LV-)?[0-9]{4}', EE: '[0-9]{5}' }[
          marketSelect.value
        ] || '.+';
      refreshLockers();
      refreshTerms();
      if (!delivery.options.length) summary.textContent = t[31];
    };
    const input = () => ({
      country: marketSelect.value,
      currency: selected().currency,
      deliveryId: delivery.value,
      lines: productInputs
        .filter(({ q }) => Number(q.value) > 0)
        .map(({ p, q }) => ({ sku: p.sku, quantity: Number(q.value) })),
    });
    const canOrder = context.productionReady || context.canCreateTestOrder;
    const customerInput = () => ({
      name: fields.name.value,
      email: fields.email.value,
      phone: fields.phone.value,
      address: {
        country: marketSelect.value,
        line1: fields.line1.value,
        city: fields.city.value,
        postalCode: fields.postalCode.value,
      },
      ...(locker.required ? { lockerId: locker.value } : {}),
    });
    form.addEventListener('input', (event) => {
      if (event.target === terms) {
        submit.disabled = !(canOrder && quoted && termsAvailable && terms.checked);
        return;
      }
      if (productInputs.some(({ q }) => q === event.target)) {
        cartLines = normalizeCheckoutCart(
          productInputs.map(({ p, q }) => ({ sku: p.sku, quantity: Number(q.value) })),
          catalog,
        );
        emitCart();
      }
      invalidateQuote();
    });
    marketSelect.addEventListener('change', refresh);
    delivery.addEventListener('change', refreshLockers);
    quoteButton.addEventListener('click', async () => {
      if (cartEmpty() || quoteBusy) return;
      quoteBusy = true;
      await run(quoteButton, async () => {
        const version = quoteVersion,
          proposal = input(),
          customer = customerInput(),
          method = selected().delivery.find((d) => d.id === delivery.value);
        const requestedDeliveryQuoteId =
          method?.pricing === 'carrier'
            ? (await client.deliveryQuote({ ...proposal, customer })).id
            : undefined;
        if (version !== quoteVersion) throw new Error('quote_price_changed');
        const result = await client.quote({
          ...proposal,
          customer,
          ...(requestedDeliveryQuoteId ? { deliveryQuoteId: requestedDeliveryQuoteId } : {}),
        });
        if (version !== quoteVersion) throw new Error('quote_price_changed');
        quoted = result;
        deliveryQuoteId = requestedDeliveryQuoteId;
        summary.textContent = t[21] + ': ' + money(quoted.amount, quoted.currency);
        submit.disabled = !canOrder || !termsAvailable || !terms.checked;
        status.textContent = '';
      });
      quoteBusy = false;
      refreshEmpty();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!canOrder || !quoted || !termsAvailable || !terms.checked || !form.reportValidity())
        return;
      await run(submit, async () => {
        const customer = {
          name: fields.name.value,
          email: fields.email.value,
          phone: fields.phone.value,
          address: {
            country: marketSelect.value,
            line1: fields.line1.value,
            city: fields.city.value,
            postalCode: fields.postalCode.value,
          },
          ...(locker.required ? { lockerId: locker.value } : {}),
        };
        const disabledFields = Object.values(fields).map((field) => [field, field.disabled]);
        const quoteDisabled = quoteButton.disabled;
        for (const [field] of disabledFields) field.disabled = true;
        quoteButton.disabled = true;
        let order;
        try {
          order = await client.create({
            ...input(),
            customer,
            quoteHash: quoted.quoteHash,
            ...(deliveryQuoteId ? { deliveryQuoteId } : {}),
            acceptedPolicyVersion: selected().policyVersion,
            ...(context.paymentRecovery
              ? { paymentRecoveryNotice: context.paymentRecovery.noticeVersion }
              : {}),
          });
        } catch (error) {
          if (client.attempt) {
            content.replaceChildren();
            const retry = element('button', { type: 'button' }, t[16]);
            retry.addEventListener('click', () =>
              run(retry, async () => {
                await orderView(await resumeOrder(true));
                status.textContent = '';
              }),
            );
            content.append(retry);
          } else {
            quoted = undefined;
            deliveryQuoteId = undefined;
            submit.disabled = true;
          }
          throw error;
        } finally {
          for (const [field, disabled] of disabledFields) field.disabled = disabled;
          quoteButton.disabled = quoteDisabled;
        }
        clearCart();
        await orderView(order);
        status.textContent = t[27];
      });
      submit.disabled = !(canOrder && quoted && termsAvailable && terms.checked);
    });
    form.append(summary, element('div', { class: 'actions' }, quoteButton, submit));
    content.append(form);
    refresh();
  };
  if (client.attempt) {
    try {
      const order = await resumeOrder();
      const sameView =
        layout === 'one-page' &&
        renderPayment &&
        order.payment_state === 'pending' &&
        client.recoveryState !== 'processing' &&
        order.stock_state === 'reserved' &&
        order.snapshot.customer?.address &&
        context.paymentConnected &&
        (context.productionReady || context.canCreateTestOrder) &&
        context.embeddedCheckoutConfigured !== false &&
        markets.some(
          (m) =>
            m.country === order.snapshot.country &&
            m.checkoutEnabled !== false &&
            m.policyVersion === order.snapshot.policyVersion,
        ) &&
        order.snapshot.lines.every((l) =>
          catalog.some((p) => p.sku === l.sku && p.enabled !== false),
        );
      if (sameView) await formView(order);
      else await orderView(order, layout === 'one-page');
    } catch {
      if (!client.attempt) {
        formView();
        status.textContent = t[29];
        return client;
      }
      status.textContent = t[30];
      const retry = element('button', { type: 'button' }, t[16]);
      retry.addEventListener('click', () =>
        run(retry, async () => {
          await orderView(await resumeOrder());
          status.textContent = '';
        }),
      );
      content.append(retry);
    }
  } else formView(undefined, recovered?.state === 'restore' ? recovered.order : undefined);
  return client;
}
