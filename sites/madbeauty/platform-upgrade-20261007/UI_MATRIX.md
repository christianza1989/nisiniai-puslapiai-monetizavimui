# Tikrų UI būsenų priėmimo registras

Aktyvus I04 registras. Tik named isolated8841, synthetic teikėjai/klientai; production nepakeista. Node/Workers kontrakto PASS atskirtas nuo actual naršyklės įrodymo. „Likę“ nėra PASS. Išsamesnės ankstesnių kelių aplinkybės ir apribojimai yra ACCEPTANCE.md. Ignored evidence saugo vietinius vaizdus ir skaitinius matavimus; nėra viešo release dalis.

| Kelias / rolė | Turimas actual įrodymas | Likę actual būsenų darbai |
|---|---|---|
| Paslaugų/miestų paieška / klientas | Search empty, typed professional→booking, map; search-fixed-widths.json320/390/820/1440 be document overflow; pradinis combobox keyboard kelias | Atskirai suvesti paslaugų/city loading/network/stale ir keyboard matricos nuorodas |
| Pasiūlymo pasirinkimas/redagavimas / owner | Catalogue→draft→submit→operator→booking; offers-widths.json; fazių invalid-sum400 palieka laukus, pataisytas save | Nepriced/archived/required-addon/expired-qualification actual empty/error/keyboard |
| Meniu grupė / owner/operator/klientas | Two-tab version409, typed text preserved, resubmit reviewed version2; public native anchor Enter focus/Tab; service-group-widths.json | Group network save/retry ir loading |
| Kainų CSV / owner | Actual authenticated attachment, invalid header guidance/input retained, atomic private30→31/reload, old CSV409, reviewed publish | Keyboard dialog/escape ir uncertain-network idempotent retry |
| Laiko pasirinkimas / klientas | Visas vizitas netelpa→ilgesnis intervalas; mobile competing-hold409→refresh→contact; offline network error preserves17:30filter→restart/retry; actual loading observed | Actual pasenęs5min kandidatas, expired2min hold ir keyboard-only slot kelias; papildomi width matavimai bendriems error blokams |
| Visas kelių paslaugų vizitas / klientas/meistras | Explicit whole sequence confirm/reschedule, actual saved segment calendar ir mobile screens | Visa cancellation stale/network dialog matrix |
| Fazės / owner/meistras/klientas |20/40/30editor400/recovery, staff/chair calendars, phase-only waitlist explicit confirm; phases-calendar-widths.json | Keyboard phase editor ir saved-hold phase version conflict actual |
| Filialas / owner/operator/klientas | Private draft→review→public, no-full-slot→extended time, explicit branch booking/reschedule/reload; branch-booking-widths.json | Network/location archive/version konfliktų pilna UI matrica |
| Laukiantieji / klientas | Short-window400 retained/recovery,15min offer→2min hold→explicit90min confirm; waitlist-history-widths.json | Expired offer/claim conflict actual UI (server/Workers jau patikrinta) |
| Pakartotinis vizitas / klientas | Old50/current55 notice→new confirm, old snapshot unchanged | Archived alternative/addon removal actual UI |
| Kliento kortelė/eksportas/trynimo prašymas | Provider stale409/preserved input/reload; four measured widths; fresh OTP actual own JSON download, request→withdraw | Keyboard/network; erasure execution neaktyvi iki faktinės policy |
| Rules/reports/complaints/gallery | Actual save/error/recovery/reload, authenticated report CSV, reviewed gallery/service CTA ir staff portraits; gallery-public-widths-fixed.json | Submenu keyboard ir kiekvieno taikomo stale/conflict/network actual įrodymo nuorodos |
| Komandos prieigos/taksonomija/kvalifikacijos / owner/operator | Team mobile, taxonomy archive→restore, operator versioned review; rolės/expiry/server DTO tests | Reception/practitioner normal/empty/error/keyboard UI suvestinė; qualification expiry actual UI |

Galutinis I04 acceptance reikalauja uždaryti taikomas eilutes, įrašyti konkrečius matavimus ir įrodymus. Full160pairedtestų bei302assetsbuildPASS neužbaigia visos matricos.
