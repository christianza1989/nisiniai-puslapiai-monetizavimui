// Shared by the central pilot outbox and delegated organization outboxes.
// Transport remains the existing private Hostinger adapter.
export function transactionalMail(row,payload){
 if(row.type==='account-closure-notice')return {to:row.recipient,subject:'Madbeauty paskyros uždarymo priminimas',text:`Tavo paskyra ilgą laiką nenaudota. Pagal saugojimo tvarką ją uždarysime ne anksčiau kaip ${payload.earliestClosureAt}.\nJei nori ją išsaugoti, prisijunk: https://madbeauty.lt/paskyra\nBūsimų vizitų ar veiklos prieigų turinčios paskyros šiuo veiksmu neuždaromos.\nMB Pinet · info@pinet.lt`,id:row.id.replaceAll('_','-')};
 const format=options=>new Intl.DateTimeFormat('lt-LT',{timeZone:'Europe/Vilnius',...options});
 const subject=row.type==='login-code'?'Madbeauty prisijungimo kodas':row.type==='reminder'?'Madbeauty priminimas apie vizitą':row.type==='waitlist-offer'?'Madbeauty laiko pasiūlymas':'Madbeauty vizito atnaujinimas';
 const starts=payload.startAt?format({dateStyle:'medium',timeStyle:'short'}).format(new Date(payload.startAt)):'';
 const text=row.type==='login-code'?`Jūsų prisijungimo kodas: ${payload.code}\nGalioja iki ${payload.expiresAt}. Jei prisijungimo neprašėte, ignoruokite šį laišką.`:row.type==='waitlist-offer'?`Atsirado jūsų pageidavimą atitinkantis laikas: ${starts}.\nTai pasiūlymas, ne rezervacija. Galioja iki ${format({timeStyle:'short'}).format(new Date(payload.expiresAt))}.\nPasirinkite ir patvirtinkite paskyroje: https://madbeauty.lt/paskyra/vizitai#būsena=pageidavimai\nMB Pinet · info@pinet.lt`:`Vizitas ${payload.bookingId}\nBūsena: ${payload.status}\nPradžia: ${starts}\nIšsami informacija: https://madbeauty.lt/paskyra/vizitai\nMB Pinet · info@pinet.lt`;
 return {to:row.recipient,subject,text,id:(row.challenge_id||row.id).replaceAll('_','-')};
}
