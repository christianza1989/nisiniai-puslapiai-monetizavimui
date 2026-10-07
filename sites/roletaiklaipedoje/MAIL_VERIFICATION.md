# Pašto bandymas ir gavimo diagnozė

Vienas autorizuotas self-test info@pinet.lt, ne klientui: sent2026-10-07T12:51:18.486Z, Message-ID <dacaf4dd-53d4-48b9-bf6e-f27d8b146b02@pinet.lt>. D1 išsaugojo tikrą sutikimo laiką ir notified po SMTP accepted; exact synthetic lead pašalintas pagal site/UUID/name.

Pirminės keturios INBOX paieškos nerado laiško. Papildoma read-only diagnostika 2026-10-07T13:50:53.503Z rado tą patį Message-ID **INBOX.Junk**. Tik šio pažymėto laiško pasirinktų headers PEEK rodo **SPF, DKIM ir DMARC pass**; spam score/flag nepateikti. MAIL_DIAGNOSTIC saugo išfiltruotą rezultatą, ne slaptažodį, kitų laiškų turinį ar pilnus routing headers. Kodas naudojo EXAMINE ir PEEK: jokių bodies, move, Seen flag, antro siuntimo ar nustatymų pakeitimo.

U2 PASS, U3 FAIL: priėmimas ir Junk gavimas nėra INBOX priėmimas. Tiksli filtravimo priežastis nežinoma; nėra įrodymo, kad reikėtų taisyti bendrą SMTP protokolą ar DNS autentifikaciją. Pašto/DNS nustatymų keisti ši užduotis neautorizuoja. SMTP probe sustabdytas; įprasta8794 peržiūra SMTP/voice OFF. Testas nėra paklausa.
