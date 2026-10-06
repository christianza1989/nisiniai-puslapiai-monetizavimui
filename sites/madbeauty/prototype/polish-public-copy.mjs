import {readFile,writeFile} from 'node:fs/promises';
const f=new URL('./public/public-views.mjs',import.meta.url);let s=await readFile(f,'utf8');const replacements={
'Trys miestai šiame preview naudojami struktūros bandymui. Tai nėra patvirtinta dabartinė pasiūla.':'Pasirink miestą ir peržiūrėk tuo metu prieinamus paslaugų variantus.',
'Privatus vietų ir paslaugų struktūros preview. Kategorijos veda į konkretų miesto pasirinkimą.':'Atrask paslaugas savo mieste ir patikrink visam vizitui tinkantį laiką.',
'Išbandyti  pradžią':'Sukurti meistro profilį','Išbandyti  darbo dieną':'Atidaryti darbo vietą',
'Numatomi nemokami pradiniai profiliai ir bazinis pilotas. Šis preview yra fiktyvus; realios registracijos nėra.':'Sukurk profilį, pridėk paslaugas bei grafiką ir pateik informaciją peržiūrai.',
'Mobile matysi patogią agendą.':'Telefone matysi patogų dienos vizitų sąrašą.'};for(const[a,b]of Object.entries(replacements))s=s.replaceAll(a,b);
s=s.replace("const bookings=await ctx.adapter.appointments({organizationId:'demo-org-0'}),rows=await ctx.adapter.catalog();","const bookings=ctx.adapter.mode==='real'?[]:await ctx.adapter.appointments({organizationId:'demo-org-0'}),rows=await ctx.adapter.catalog();");
await writeFile(f,s);
