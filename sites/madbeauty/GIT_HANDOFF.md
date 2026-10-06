# Madbeauty paleidimas iš Git

**Aktualus perdavimas kitai sesijai:** [2026-10-06 startas ir Cloudflare/domeno darbų eilė](../../docs/NEXT_CODEX_HANDOFF_2026-10-06.md). Abiejų repo aktualų kodą dabar galima imti iš `main`; root PR3–6 ir public core Dovanos PR3 / portable build PR4 sujungti. Savininkas pavedė kitai sesijai užbaigti ir paleisti; perduodamas vietinis kodas, ne jau įgyvendintas Workers/D1 adapteris.

2026-10-06. Į Git perduotas V3 vietinės platformos kodas, naudojami WebP/fontų/ikonų failai, planai ir priėmimo dokumentacija. Vietinis funkcijų bei normalios desktop/mobile sąsajos etapas apima 69 paviršius su savininko sustabdyta demo galerijos peržiūra. Tai nėra viešas deployment ar production priėmimas.

## Naujas kompiuteris

Pagal [bendrą dviejų repo instrukciją](../../docs/MULTI_MACHINE.md) abu checkout laikyti greta: `nisiniai_puslapiai_monetizavimui` ir `dovanos-memorycasting`. Aktualus `main` jau turi PR3 → PR4 → PR5 bendras sutartis ir PR6 Madbeauty. Node rekomenduojamas bent 22.22 pagal bendrų priklausomybių reikalavimus.

Iš `dovanos-memorycasting` paleisti `npm run install:ci`. Tada iš nišų repo root:

```powershell
npm ci --prefix content-studio
node sites/madbeauty/content/bootstrap-checkout.mjs
node sites/madbeauty/acceptance/regression-uiux-v3.mjs
node sites/madbeauty/prototype/app-server.mjs
```

Atidaryti `http://127.0.0.1:8788/`. Jei portą naudoja kita sesija, pasirinkti laisvą `MADBEAUTY_APP_PORT`; svetimų procesų nestabdyti. Serveris prisiriša tik prie loopback, default preview sukuria naują izoliuotą testinį katalogą. `MADBEAUTY_DATA_MODE=unseeded` naudoja atskirą naują registracijos DB. Nepersikelia seno kompiuterio vartotojai, seansai, rezervacijos ar operatoriaus QA paskyra.

`bootstrap-checkout.mjs` patikrina nekeistą approved release, jo peržiūrų ir WebP hash, tada bendru importeriu atkuria tik vietinį turinio sandbox. Versioned `content/initial-release/` turi 7 approved puslapius, iš jų 3 gidus, ir 20 viešų WebP; originalų, studijos juodraščių bei privatų runtime ten nėra. Istoriniai absolute-path kvitai išlaikyti kaip įrodymai; jų `import-initial-release.mjs` nereikia naudoti kitame kompiuteryje. Naujas turinys toliau eina per bendrą studijos review/release eigą.

## Testinis prisijungimas

Vietinis el. pašto capture skirtas tik `@example.com` QA adresams; tikras SMTP/INBOX dar neprijungtas. Registracijos kodą paimti privačiu [backend helperiu](backend/browser-test-capture.mjs), jo išvesties runtime failo į Git ar viešą UI nekelti. Testo operatoriaus teisės nėra automatiškai suteikiamos naujo kompiuterio paskyrai; privataus vietinio QA administravimo komandos yra [backend dokumentacijoje](BACKEND_DECISION.md).

## Kas sąmoningai lieka vietoje

Runtime DB, OTP, serverio raktai, seansai, paštas, klientų duomenys, PNG originalai ir žali naršyklės QA/screenshot failai neperkeliami. Priėmimo matricos gali nurodyti šiuos originalius vietinius įrodymus; klonavimas jų neatkuria ir nesuteikia naujo PASS. Testus galima pakartoti savo checkout, neperrašant originalių šio kompiuterio įrodymų.

Likusios ribos: [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md), [UI/UX priėmimas](uiux/ACCEPTANCE.md), [A–Z auditas](PHASE-1-AUDIT.md). Tikras SMTP pristatymas, production katalogo SSR/SEO, hostingas/DNS/TLS, fizinių įrenginių patikros ir tikri teikėjai lieka atskiri darbai. Git įkėlimas jų neįjungia.
