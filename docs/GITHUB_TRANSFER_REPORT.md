# GitHub perkėlimo patikra — 2026-10-05

Abu repo sukurti, main įkeltas ir GitHub patvirtinta PRIVATE prieiga:

- https://github.com/christianza1989/nisiniai-puslapiai-monetizavimui
- https://github.com/christianza1989/niche-public-core

Patikrintos naujos GitHub kopijos dviejuose gretimuose kataloguose, ne esamo kompiuterio checkout priklausomybės. Testuotos source versijos: root `128918d4841c67aef603fba32d139a3b69fea9cb`, companion `bb0a0e50e2a2e8f538371d2da003b2ba72eff46a`. Po jų pridėta tik ši dokumentinė ataskaita, README nuoroda ir darbo užbaigimo įrašas.

## Rezultatai

| Patikra | Faktinis rezultatas |
|---|---|
| Abiejų repo GitHub clone ir main versijos | PASS |
| Studijos npm ci iš lock | PASS, 8 paketai |
| Companion portable install:ci iš lock | PASS, 687 paketai |
| Studijos visas test suite | PASS 24/24 |
| Viešo core test:core | PASS 44/44 |
| content:compile | PASS, 9 patvirtinti V1 svetainių paketai |
| Bendrų V2 validatoriaus ir JSON schemos source tapatumas | PASS, baitas į baitą |
| Repository safety regresijos | PASS 4/4 |
| Domain-history testai | PASS 9/9 |
| PowerShell workspace activation | PASS, tikri PINET_VOICE_ENABLED/PINET_SMTP_ENABLED=false ir gretimas config failas |
| Įkeliamų blobų safety scan | PASS, pirminis root 1698 failai ir companion 966, vėlesni savo delta atskirai |

Patikros atliktos su Windows, Node22.18.0/npm10.9.3. Viena transitive priklausomybė `machina` reikalauja Node22.22+, todėl naujam kompiuteriui dokumentuotas Node22.22+. Install buvo sėkmingas; warning nėra visų būsimos platformos scenarijų suderinamumo įrodymas.

Pirmas švarus clone atskleidė LF/CRLF tapatumo klaidą ir vieną transient Windows užrakto pašalinimo EPERM. Abiejų repo source eilučių sutartis suderinta per .gitattributes, export helper atnaujintas. Studijos lock release turi bounded Windows retry su savininko token patikra kiekvienu bandymu. Naujas testas patvirtina, kad pasikeitus savininkui kitas užraktas paliekamas. Po pataisų abi saugyklos iš naujo klonuotos ir visas studijos suite praėjo; tapatumo patikra nebuvo susilpninta.

## Perkėlimo ribos

Tai bendro source perkėlimas, ne pilnas kompiuterio atsarginės kopijos atkūrimas. Sekretai, klientų/pašto/runtime DB, studio data/draft/jobs, local build/cache/browser profiliai ir legacy fabrikas archyvas neįkelti. Approved paketai ir reikalinga jų vieša medija yra companion repo. Vietiniai originalai neištrinti. Pattern safety ir žinomų vietinių sekretų tikslios atitikties patikra nėra universali visų įmanomų asmens duomenų atpažinimo garantija.

Esamo `dovanos-memorycasting` checkout senasis origin ir istorija nepakeisti. GitHub companion yra atskira source istorija; tolesniems bendriems pakeitimams naudoti naują GitHub checkout/PR arba sąmoningai perkelti patikrintą delta. Įkėlimo snapshot neprideda kitų sesijų vėliau rašomų uncommitted pakeitimų automatiškai. Madbeauty įgyvendinimas tęsiasi savo sesijoje; snapshot jo nepriima kaip baigto portalo.

Python runtime diegimas/DB migracijos, platformos full UI/backend, build ir HTTP SEO smoke, Lighthouse, realūs SMTP/voice/FB/pirkėjų bandymai, DNS/deployment, launch/demand šiame source perkėlime netestuoti ar neįjungti. Nekeisti šių statusų pagal vien GitHub clone sėkmę. Manual GitHub workflow nepaleistas; branch protection nenustatyta.

Kitam AI: [MULTI_MACHINE](MULTI_MACHINE.md) ir [INTEGRATING_A_PROJECT](INTEGRATING_A_PROJECT.md). Reikia prieigos abiem privatiems repo; tuomet savo branch, perskaitytas AGENTS ir faktinių nišos/core sutarčių patikra. GitHub nuoroda nėra automatinis leidimas įjungti gyvus kanalus ar keisti kitų agentų failus.
