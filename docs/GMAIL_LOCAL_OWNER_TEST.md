# Vietinė Gmail jungtis ir tikro savininko bandymas

**2026-10-18 pataisa po tikro Google callback.** Pradinis parser neteisingai
atmetė RFC9207 `iss` lauką. Tikro bandymo adresas, kelias ir state sutapo, bet
tokeno keitimas nebuvo pradėtas; šifruotas pending įrašas ir pirmas FAIL išliko.
Dabar priimamas ir reikalaujamas tik vienas tikslus `iss=https://accounts.google.com`.
Trūkstamas, dubliuotas, HTTP, legacy ar kito teikėjo issuer atmetamas prieš kodo
sunaudojimą; state/PKCE, vienkartinumas ir dabartinės savininko teisės išlieka.
Pirmas atkūrimo testas1FAIL/36PASS išsaugotas; tai mūsų adapterio klaida,
ne savininko Gmail prisijungimo problema. Po pataisos38 offline ir2 tikslinės
OAuth PostgreSQL patikros praėjo; kitų ankstesnių bandymų apimtis išlieka žemiau.
[Google authorization response sutartis](https://developers.google.com/identity/openid-connect/reference).

2026-10-18. Šis paketas įgyvendina ribotą vietinį Gmail OAuth ir savininko
bandymą bendrame pašto core. Tai nėra kampanijų ar visos asmeninės dėžutės
importo įjungimas. Gyvo siuntimo, atsakymo ir lietuviško UI priėmimas turi
atskirus faktinius kvitus; toliau išvardytos imituoto transporto patikros jų
nepakeičia.

## Kas įgyvendinta

`runtime/src/pinet_core/mail_provider/` naudoja oficialų įdiegtos programos
OAuth srautą su state, PKCE S256 ir vienkartiniu, dešimt minučių galiojančiu
callback tik į `127.0.0.1`. Tokeno ir Gmail API kilmės fiksuotos. Užklausų bei
atsakymų dydžiai riboti; nėra automatinio tokenų keitimo ar siuntimo kartojimo.
Prašomi tik `gmail.readonly` ir `gmail.send` leidimai. Naršyklės prisijungimo
slapukai ir Codex Gmail jungties prieiga neperkeliami į platformą.

Kiekvienas savininko veiksmas tikrina tikrą galiojančią Session, dabartinį
owner Membership ir BusinessGrant, verslą, aplinką bei švaraus vykdomo source
SHA. Gmail OAuth tokenai laikomi užšifruotame vietiniame Vault, susietame su
vartotoju, grant ir verslu. Duomenų bazė ir modelio įvestis tokenų negauna.
Callback kodas sunaudojamas patvariai prieš vieną tokeno keitimo užklausą;
prieš aktyvinant jungtį savininkas patikrinamas dar kartą.

Laiškas kuriamas kaip įprastas `Case/MailMessage`, tačiau tik aiškiai
pažymėtas savininko savitikros įrašas gali naudoti šį gateway. Gavėjas ir
siuntėjas yra tas pats Gmail API patvirtintas adresas. Įprasta `DraftInput`
neleidžia klientui pakeisti siuntėjo. Senos kalibravimo ar acquisition žinutės
neperklasifikuojamos į gyvus Gmail laiškus, Conversation nekuriamas fiktyviai.

Prieš siuntimą įrašomas ir commitinamas vienas `sending` ketinimas. Dabartinės
teisės dar kartą tikrinamos prie pat Gmail POST. Būsenos atskiria
`accepted_by_gmail`, `rejected` ir `delivery_unknown`; Gmail priėmimas nėra
pristatymo, atidarymo ar žmogaus atsakymo įrodymas. Tą patį įrašą pakartotinai
vykdantis procesas antro siuntimo neatlieka. Neaiškus rezultatas automatiškai
nekartojamas.

Gavimas tikrina tik jau priimto bandymo Gmail giją, daugiausia30 žinučių.
Vien gijos ID neužtenka: būtini tikslūs RFC Message-ID/References ir dalyviai.
Tikras atsakymas per bendrą `mailbox.receive_reply` patenka į tą patį Case,
deduplikuojamas ir gauna `authenticated_gmail_reply` kilmę. Conversation pašto
adapteris atskirai atsisako šio naujo šaltinio, kol neturi tikros Gmail jungties.

## Vietinis vykdymas

Naudoti `runtime/scripts/gmail_owner.py`. Veiksmai: `connect`,
`prepare-self-test`, `send-self-test`, `sync-self-test`. Kiekvienam reikia
dabartinės savininko Session privataus failo, tikslaus verslo ir connection
UUID, Vault ir atskiro rakto failo bei naujo privataus rezultato kelio.
`connect` papildomai priima oficialiai atsisiųstą Desktop OAuth JSON ir naują
privatų authorization URL rezultatą. Savitikros užklausa turi tik request UUID,
temą ir tekstą; gavėją nustato patvirtinta jungtis. CLI neatidaro naršyklės ir
nespaudžia Google sutikimo už vartotoją.

`PINET_GMAIL_OWNER_ENABLED` numatytai false. Aiškiam bandymui reikia švaraus
source SHA, įprastos `control_enabled/customer_enabled` konfigūracijos ir
vietinės arba `test-*` aplinkos. Naudoti ribotą runtime DB rolę; neįjungti SMTP,
voice, kampanijų ar kitų modelių kaip OAuth šalutinio poveikio. Vykdymą pradėti
per aktualumo vartų `-- executable args` apvalkalą, kai įmanoma.

Privatūs failai turi būti už Git ribų, be symlink ar bendro naudojimo katalogų.
Fernet rakto nelaikyti šifruotame įraše. POSIX režimai vieni neįrodo Windows
ACL: Windows operatorius turi atskirai apriboti katalogą ir jo vaikus iki
dabartinio vartotojo bei SYSTEM ir patikrinti paveldėjimą. Tai operatoriaus
vietinis raktas, ne KMS ar produkcinės kelių klientų saugyklos pakaitalas.
Desktop client secret, OAuth kodų, tokenų ir laiškų tekstų nekopijuoti į Git,
komandų argumentus ar modelių instrukcijas.

Atšaukus Google leidimą, išjungus vietinę jungtį ar pasibaigus Session, naujų
veiksmų neatlikti. Neišspręsto `.lock`, `refresh_pending`, `sending` ar
`delivery_unknown` įrašo nevalyti automatiškai: pirmiausia sutikrinti konkretų
procesą ir išsaugotą bandymą. `PINET_GMAIL_OWNER_ENABLED=false` sustabdo naujas
operacijas; bendri Case/MailMessage ir ankstesni kvitai išlieka.

## Patikros ir likę darbai

29 offline patikros aprėpia MIME, state/PKCE, scopes, saugyklos šifravimą ir
užraktą, callback HTTP kilmę bei vienkartinį realaus loopback priėmimą. Atskiras
7 patikrų ribotas PostgreSQL bandymas tikrina owner/RLS, commit prieš siuntimo POST,
konkurencinį vieną siuntimą, tikro adapterio atsakymo formą, deduplikavimą ir
esamo savininko pašto API skaitymą su **imituotu Gmail transportu**, vieną OAuth
keitimą po patvaraus kodo sunaudojimo ir grant atšaukimą prieš jungties aktyvinimą. Legacy pašto
regresija40PASS; jos pirmas nesėkmingas paleidimas išsaugotas: izoliuotame
wrapper trūko sintetinių worker/operator/edge autentifikavimo reikšmių. Senas
runtime autentifikavimas nesusilpnintas.

Pirmos offline adresų bei pytest rezervuoto parametro testinių duomenų klaidos
išsaugotos atskiruose kvituose ir ištaisytos. Tai testų autoriaus klaidos,
ne Gmail ar klientų duomenų gedimai. `cryptography==50.0.1` įvardyta tiesiogiai
runtime manifeste; ši versija jau buvo lock, offline lock rezoliucija ir realus
šifravimo/tamper bandymas patikrinti.

Priimti dar reikia: tikrą Google sutikimą, OAuth/token ir Gmail API veikimą,
tikrą išsiųsto bandymo gavimą ir rankinį atsakymą, jo įrašymą bei atskirą
`mail_display` Task vertimą ir faktinį originalo/lietuvių kalbos UI vaizdą.
Esamo originalo nekeisti, vertimo nepaversti siunčiamu laišku.
Kampanijų dispatch, naujų klientų kontaktavimas ir automatinis atsakymas nėra
šio savitikros gateway galimybės; jie jungiami per bendras galiojančias agentų
ir kanalų sutartis. Visos dėžutės history cursor, bounce/open/click statistika,
hosted saugykla ir viešas diegimas šiuo paketu nepriimti.

Oficialūs šaltiniai: [Gmail siuntimas](https://developers.google.com/workspace/gmail/api/guides/sending),
[Desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app),
[Google API duomenų politika](https://developers.google.com/terms/api-services-user-data-policy).
