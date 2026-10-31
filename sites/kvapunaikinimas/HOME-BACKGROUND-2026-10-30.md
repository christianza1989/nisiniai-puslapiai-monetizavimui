# Pagrindinio puslapio fonų fiksavimas · 2026-10-30

Rokas pateikė ekraną su debesų krašto nukirsta žmogaus galva ir paprašė atkurti originalo elgesį slenkant. Priežastis buvo mūsų pridėta `prefers-reduced-motion: reduce` taisyklė: ji pakeisdavo abiejų desktop fonų `background-attachment:fixed` į `scroll`. Šiame IAB tikroji nuostata yra reduce:true. Fono pozicionavimo plotas taip pasikeisdavo iš viewport į720px sekciją; plačiame lange nukirsdavo galvą. Originalas toje pačioje aplinkoje išlaiko fixed.

Pašalinta tik ši fono override taisyklė. Originali `50%100% / cover` padėtis, debesų SVG ir abi nuotraukos nepakeisti. Mobilus source scroll režimas, karuselių reduced-motion stabdymas ir transition slopinimas išlieka. Native tekstai, baltas automobilio numeris, forma ir sutarti mobilūs patobulinimai nepakeisti.

Actual patikra: originalas ir Core viename naršyklės skirtuke pakaitomis, su tais pačiais1920×900,1440×900 ir390×844 viewport. Visuose6 bandymuose reduce:true. Kiekvienam4 tikro viewport kadrai: pradžia0px, po200px slinkimo, antrasis fonas priartinus jo antraštę, dar80px žemiau. Native key input ir po jo gautas AX/DOM patvirtino tikrą scroll poziciją; body PageDown eksperimentas, peršokęs į2175px, į priėmimo seriją neįtrauktas.

- 1920/1440: abu originalo ir Core fonai fixed, position50%100%,size cover.390: abu scroll, kaip originale.
- 1920×900 žmogaus galva matoma tuo pačiu kadru kaip originale; prieš ir po200px fonas lieka toje pačioje viewport padėtyje. Antras mėlynas fonas taip pat sutampa prieš ir po80px.
- 24 viewport JPEG ir pilni6 DOM įrašai: `D:/Core/output/kvapunaikinimas-home-background-20261030`. QA JSON patvirtina abi attachment reikšmes, tikrus slinkimo atstumus ir0 overflow. Pradinis sugadintas kadras išsaugotas atskirai.
- 305 public regresijos, production build,2 RSC manifests ir12 puslapių native SEO smoke PASS. Impeccable layout scan prieš/po:[]; šis skaičius pats savaime neįrodo fono teisingumo.

Tai išmatuotas dviejų homepage fonų taisymas, ne visos svetainės pixel-perfect pažyma. Source originalas palygintas gyvai; telefonų fiziniai Safari/Android nebandyti. Actual.lt išlieka juodraštis; production/DNS/SMTP ar istorinių įrodymų keitimų nėra.

[Interaktyvi versija](http://127.0.0.1:8918/) · [Vienodų ekranų ir slinkimo būsenų palyginimas](http://127.0.0.1:8919/backgrounds). Ankstesni galutiniais vadinti fono vertinimai nepademonstravo actual reduced-motion aplinkos; šis papildymas pateikia tą patikrą.
