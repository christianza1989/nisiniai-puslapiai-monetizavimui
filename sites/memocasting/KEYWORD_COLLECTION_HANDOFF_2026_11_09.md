# 20 kolekcijų užduoties būklė prieš kompiuterio perkrovimą

## Savininko užsakymas

Išanalizuoti `C:/Users/Lenovo/Downloads/Keyword Stats 2026-11-02 at 12_47_40.csv`, atrinkti apie 20 stipriausių su pasiūlymu susijusių pagrindinių temų ir long-tail frazes, parengti kiekvienos kolekcijos skirtingą naudingą ne trumpesnį kaip 1 000 žodžių tekstą, įdėti tikrus katalogo produktus, susieti kolekcijas su esamais gidais ir paskelbti Cloudflare. 20 yra bendras tikslas, įtraukiant dvi esamas kolekcijas, kurias dar reikia išplėsti.

## Atlikta ir ribos

- `KEYWORD_COLLECTION_PLAN_2026_11_09.md`: 20 pagrindinių temų, exact CSV frazės ir vertės, long-tail grupės, preliminarūs URL, susiję gidai, sezoniškumo ir dubliavimo rizikos. Visi 20 pagrindinių ir visos nurodytos long-tail frazės automatiškai sutikrintos su originaliu CSV; geografinis eksportavimo filtras faile nepateiktas, todėl jo neišgalvoti. Jokio naujo mokamo tyrimo nevykdyta.
- `collection-drafts/`: penki savarankiškai parengti Markdown tekstų juodraščiai, Unicode žodžių skaičius: mamai 1 081, vyrams 1 080, porai 1 124, šeimai 1 057 ir kalėdinės mamai 1 074. Tai **juodraščiai**, dar ne revision-bound review / approval / release; tekstus dar kartą perskaityti ir faktus bei sąsajos vaizdą patikrinti prieš publikuojant.
- Trys iš jų (mamai, vyrams, porai), taip pat trys aktualūs jų gidai ir dovanų hubas su naujais kontekstiniais ryšiais išsaugoti izoliuotoje studijoje `C:/Users/Lenovo/Documents/Nisiniai_puslapiai/_worktrees/memo-keywords-studio-20261109/studio-data`. Tikslią dabartinę reviziją skaityti per model API; visų septynių approval null. Šeimos ir Kalėdų mamai juodraščiai dar nėra įkelti į studiją.
- Mamai skirtas gidas turi keturis išorinius šaltinius. 2026-11-09 atidaryti jų originalai, bet pilno naujos gido revizijos review, nuotraukų ir desktop/mobile patikros dar nėra. Atkurtos tik iš viešo bazinio paketo SHA patikrintos medijos versijos, ne originalūs failai ir ne senos privačios peržiūros.
- PUBLIC darbo šakoje į galimų kolekcijų registrą įtraukta 18 planuotų adresų, visi naudojant esamus eligibility filtrus ir du tikrus produktus. Tikslinis 5 testų Node rinkinys PASS. Tai yra **vietiniai pakeitimai**, nauji puslapiai dar neįtraukti į patvirtintą turinio paketą, todėl nerodomi viešai.
- Produkcinė svetainė šioje partijoje nepakeista. Esamos dvi kolekcijos gyvos, bet iki prašomo 1 000 žodžių slenksčio dar neišplėstos. Iš 20: 5 parašyti juodraščiai, 3 iš jų studijoje, 0 naujų peržiūrėta, 0 naujų išleista, 0 naujų paskelbta.

## Toliau po perkrovimo

1. Pirmiausia patikrinti laisvą C vietą arba D diską, neprarandant kitų darbų; prieš naują reikšmingą partiją paleisti porinį `node scripts/git-freshness.mjs --phase continue` savo CORE ir PUBLIC šakoms. Prieš reikšmingą public pakeitimą iš naujo patikrinti faktinę 100 % Cloudflare Worker versiją bei 6 bindingus.
2. Išsaugoti esamus juodraščius ir studijos duomenis; nenaikinti kitų agentų worktree ir neatkurti privačių nuotraukų / review, kurių viešame pakete nėra. `KEYWORD_COLLECTION_FIRST_DRAFTS_2026_11_09.mjs` skirtas tik pirmam paleidimui tuščioje studijoje ir jau įvykdytas; jo nekartoti ant esamos studijos. Nuorodų korekcijos atskiros, jau atliktos per model API.
3. Parengti likusius 15 planuotų ilgesnių tekstų, išplėsti dvi esamas kolekcijas iki 1 000 žodžių, be dirbtinio kartojimo, melagingo didelio asortimento ar nepatvirtintų faktų. Kiekvieną prasmingai atskirti pagal gavėją / progą ir tikras pirkėjo situacijas; atskirai peržiūrėti esamus gidus.
4. Po tikrų šaltinių ir viso turinio peržiūrų suderinti visų pakeistų puslapių bei naujų URL vidines nuorodas ir `publishAt`. Ateities gidų nelinkinti iki jų realaus viešumo. Studio `review` turi atspindėti tikrai patikrintus exact revision hash; jokio tariamo review, vaizdų patikrinimo ar sugalvotos patirties.
5. Sujungti tikras patvirtintas revizijas į scoped reviewed overlay pagal `CONTENT_CORE.md`, palyginti visas kitų puslapių revizijas ir datas. Build, testai, live bindings ir `--keep-vars`, realus desktop/mobile ir HTTP canonical/sitemap/schema bei checkout consent patikrinimas yra būtini prieš galutinį priėmimą. Naujo turinio leidinys dar nesukurtas ir svetainė dar neįkelta.

## Git ir paskutinė gyva versija

- CORE atskira šaka `codex/memocasting-keyword-collections-20261109`; PUBLIC atskira šaka `codex/memocasting-keyword-collections-public-20261109`. Pradiniai baseline CORE `555c7742` ir PUBLIC `0bb06a4e`, paired freshness PASS.
- Aktualus PUBLIC turinio paketas SHA-256 `07089ea39dfa3d925645a0487ce6108f8702c5d2fce098981781137563bf9eb0`; patikrinto istorinio produkcinio source commit `943f9694`. 2026-11-09 per Cloudflare read-only patikrintas deployment `c6e3ab2d-41ae-458f-bfd5-0db57a4286ef`, Worker `32fe21af-bfc9-44d9-ba11-064bb7875953`, 100 %. Tai senstantis kvitas, prieš deploy patikrinti iš naujo.
- C buvo nukritęs iki ~0,48 GB; šios užduoties naujame PUBLIC sparse checkout išjungti tik nepakitę sekami, iš Git atkuriami neaktualūs aplankai, po to laisva ~1,2 GB. Prieš build reikia pakankamai laisvos vietos; D vartotojas šiuo metu neturėjo. Asmeninę keywords įvestį ir lokalius juodraščius laikyti privačiai, savininko CSV nedėti į viešą GitHub.
