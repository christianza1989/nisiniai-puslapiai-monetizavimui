import {readFile,writeFile} from 'node:fs/promises';
const edits={
 'public/booking-ui.mjs':[
 ['Vizito eiga pradeda konkretaus varianto, priedų ir meistro pasirinkimas.','Pasirink paslaugą, priedus ir meistrą.'],
 ['Tai solo profilis. Paslaugą atlieka žemiau nurodytas meistras.','Paslaugą atliks šiame profilyje nurodytas meistras.'],
 ['Patvirtinus pasirinkimą meistras tyliai nekeičiamas. „Bet kuris“ šioje versijoje nesiūlomas, jei nėra vienodų variantų.','Pasirink meistrą ir peržiūrėk jo kainą bei procedūros trukmę.'],
 ['outbox turi pristatymo klaidos būseną.','Pranešimo pristatyti nepavyko. Vizito patvirtinimas išlieka paskyroje.'],
 ['Išbandyti laukiančiųjų sąrašą','Prisijungti prie laukiančiųjų'],
 ['Išbandyk atskirą užklausą. Ji nėra rezervacija.','Pateik užklausą meistrui ir suderink tinkamą laiką.'],
 ['${time(b.hold.expiresAt)} Prieš','${time(b.hold.expiresAt)}. Prieš'],
 ["['vizitas']","['Vizitas']"]
 ],
 'public/public-views.mjs':[
 ["['reviews','atsiliepimai']","['reviews','Atsiliepimai']"],
 ['<h2>atsiliepimai</h2>','<h2>Atsiliepimai</h2>'],
 ['${photo(ctx,st.avatarImageId||p.avatarImageId,\'team-avatar\',\'52px\')||','${photo(ctx,st.avatarImageId||(p.kind===\'solo\'?p.avatarImageId:null),\'team-avatar\',\'52px\')||'],
 ["${btn('choose-staff','Paslaugos',`data-id=\"${st.id}\"`,'button outline small')}","${p.services.some(s=>s.practitionerId===st.id)?btn('choose-staff','Paslaugos',`data-id=\"${st.id}\"`,'button outline small'):'<span class=\"hint\">Paslaugos dar nepaskelbtos</span>'}"],
 ['Kalendorius neprijungtas. užklausos kelias atskiras.','Pateik užklausą ir suderink vizito laiką su meistru.'],
 ['laiko patikra apima visą procedūrą ir paruošimo laiką.','Laiko patikra apima visą procedūrą ir paruošimą.'],
 ['Ši  sritis išlaiko pasirinktą miestą ir sąrašą. GPS nenaudojamas.','Vietų schema padeda palyginti šio miesto pasiūlymus. Tikslų adresą rasi profilyje.']
 ],
 'public/workspace-ui.mjs':[
 ["'vizito detalės'","'Vizito detalės'"],
 ["'pokalbis'","'Pokalbis'"],
 ['atsiliepimas jau pateiktas','Atsiliepimas jau pateiktas'],
 ["'pristatymo diagnostika'","'Pranešimo būsena'"],
 ['transporto klaidos scenarijus. Booking įrašas išliko.','Pranešimo pristatyti nepavyko. Vizitas išsaugotas.'],
 ['Tik vietinis outbox. SMTP ar SMS nebandyta.','Pranešimas parengtas. Pristatymas gavėjui dar nepatvirtintas.'],
 ["money(b.priceMinor)} · versija ${b.version}","money(b.priceMinor)}"],
 ["+'</span><small>'+esc(staff)+'</small>'","+'</span>'+(d.organization.kind==='salon'?'<small>'+esc(staff)+'</small>':'')"]
 ],
 'public/content.mjs':[
 [' · parengta ir peržiūrėta 2026-10-05 · MB Pinet redakcija',' · parengta ir peržiūrėta 2026-10-05']
 ]
};
for(const [file,replacements] of Object.entries(edits)){
 if(['public/booking-ui.mjs','public/public-views.mjs'].includes(file))continue; // Saved before the original exact-edit guard stopped this one-shot migration.
 const url=new URL(file,import.meta.url);let source=await readFile(url,'utf8');
 for(const [before,after] of replacements){if(!source.includes(before))throw Error('Missing exact edit in '+file+': '+before);source=source.replaceAll(before,after);}
 source=source.replace(/(?<=\S) {2}(?=\S)/g,' ');await writeFile(url,source);
}
