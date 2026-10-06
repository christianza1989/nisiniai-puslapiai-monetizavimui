# Katalogo ir turinio apimtis

Autoritetinga read-only foundation kopija: c1f159353620aed66e9c67a95306786646c7137c / draft PR14, priklauso nuo PR13. 305 mazgai, 225 treatment, 103 miestai. Turinio plano PR10 nėra platformos diegimas.

| Sritis | Procedūrų | Būsena |
| --- | --- | --- |
| Plaukai | 34 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Nagai | 29 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Antakiai | 8 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Blakstienos | 8 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Makiažas | 9 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Depiliacija ir plaukų šalinimas | 19 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Veido priežiūra | 18 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Kūno priežiūra | 12 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Masažas | 20 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| SPA ir poilsis | 9 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Ilgalaikis makiažas | 7 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Tatuiruotės | 5 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Auskarų vėrimas | 8 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Estetinės procedūros | 8 | 14 core sričių lokalaus foundation dalis; production nepatvirtintas |
| Sportas ir judėjimas | 7 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Kineziterapija | 4 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Psichologinė pagalba | 4 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Savijautos užsiėmimai | 4 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Odontologija | 4 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Medicinos specialistai | 3 | 7 savininko patvirtintų plėtinių dalis; runtime planned |
| Gyvūnų priežiūra | 5 | 7 savininko patvirtintų plėtinių dalis; runtime planned |

21 katalogo sritis ir 33 redakcinės kryptys yra skirtingi lygiai. Pavyzdžiui, nagų sritis išskaidyta į manikiūrą, dangą, dizainą, modeliavimą ir priežiūrą. Kiekviena iš 225 procedūrų turi tikslų targetId ir vardinį skyrių; ne kiekvienai reikia atskiro straipsnio.

planTarget({taxonomyNodeId,cityId}) kontraktas: mb:catalog:{node}[:{city}], /paslaugos/{node}[/{city}]. Informacinis gidas numatytai nesiunčia kiekvieno skaitytojo į Vilnių — miesto pasirinkimas aiškus. Planuojamus adresus laikyti duomenimis, o ne išgalvotais href.

Runtime /content-targets.json naudoja approved-public-only pasiūlą, 1 valandos TTL. Funkcinis deployed / reachable ir indexEligible skirtingi. Nacionalinis browse noindex; tuščias miesto rezultatas 404; plėtiniams negalima išgalvoti pasiūlos. Indeksuojamam rezultatui reikia realių faktų, prasmingo HTML, self-canonical, matomos procedūros / miesto antraštės ir atskiro sitemap / robots priėmimo. Miestų, datų, kainų, rikiavimo bei variantų sandauga nėra masinio indeksavimo programa.

Prieš turinio CTA išleidimą privalomas actual fresh resolver. V2 editorial.commerceTargets verified:false ir checkedAt:null iki realios patikros; neparengta inline commerce nuoroda lieka tekstu. Tikro straipsnio tekstas, revision review, immutable medija ir shadow import tikrinami atskirai pagal CONTENT_SEO_HANDOFF.md.
