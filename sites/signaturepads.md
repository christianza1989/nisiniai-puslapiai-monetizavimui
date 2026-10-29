# signaturepads.lt – esamos svetainės migracija

Savininko pavedimas 2026-10-29: išsaugoti esamą išvaizdą, tekstus, kontaktus ir ypač visas nuorodas; identiškumas iki pikselio nereikalingas. Svetainė priima tik užklausas (tiesioginis atsakymas šiame chate), apmokėjimų nereikia.

Tai esamo verslo techninė migracija, ne naujos nišos ar naujos redakcinės krypties kūrimas. Naujų gidų, tekstų, pasiūlymų, kontaktų ir Pinet rekvizitų nepridedama. Originalus turinys paimamas iš savininko viešos svetainės. WordPress viešo katalogo `is_purchasable` savaime nėra leidimas įjungti prekybą.

## Šaltiniai ir darbo ribos

- Core `25292e20219b735df7f04c5807dd4c100f98addc`, public `c2d9a1fa69daa6285bcc8e8d1d039b4ad33db7da`; sėkminga abiejų repo start/continue freshness patikra.
- Atskiri checkout: `D:/Core/signaturepads-migration-20261029/nisiniai-puslapiai-monetizavimui` ir `../niche-public-core`.
- Viešų atsakymų originalai ir SHA: `D:/Core/output/signaturepads-migration-20261029/capture`.
- 28 URL, 19 produktų, 3 kategorijos. URL nepervadinami, išlaikomi galiniai pasvirieji brūkšniai ir `/#kontaktai`. Senos WordPress publikacijos, įskaitant nemeniu puslapius, inventorizuotos; jų turinys savavališkai nešalinamas.
- Kontaktai pagal esamą svetainę ir tiesioginį savininko pavedimą: `sales@signaturepads.lt`, `+370 686 88369`.
- Šiame etape nekeičiami gyvas hostingas, DNS, WordPress, bendro Core publikavimo vartai ar kitų svetainių failai. Mokamų tyrimų nėra.

## Peržiūros ir priėmimo eiga

Peržiūra yra tik loopback, noindex, su nepatvirtinto migracijos snapshot turiniu. Joje nėra suklastotų Core approve/hash įrašų. Užklausų bandymai saugomi atskirai vietiniame žurnale, tikras paštas nesiunčiamas. Po savininko turinio/peržiūros priėmimo reikalingas esamo studijos modelio approval/release/import kelias ir tik tada produkcinis domeno pakeitimas.

Privalomos patikros: visi inventorizuoti URL, vidinės nuorodos ir fragmentai; visi tekstai ir kontaktai; desktop/mobile; meniu, galerijos, kategorijų filtrai ir užklausa; 404; vietinės peržiūros noindex ir kilmės izoliacija. Peržiūros patikra neprilyginama produkciniam SEO/GEO priėmimui.
