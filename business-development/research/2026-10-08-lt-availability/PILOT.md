# BDEV-0003-P3 · .lt būsenos patikros laboratorija

Statusas **proposed**. Savininko approvalSource / approvalScope nėra. Esamos BDEV-0003 portfelio atrankos konkretinimas; [pirminiai šaltiniai ir nežinomybės](RESEARCH.md).

Siūloma iki **1 agento darbo valandos**, atskirame privačiame kataloge. Standartinėmis esamo runtime priemonėmis tik skaityti DAS būseną: ne daugiau 10 savininko portfelio atrankoje esančių .lt vardų, po vieną užklausą, paeiliui, ne dažniau nei kartą per sekundę, be retry loop. Penki sintetiniai atvejai: `available`, `registered`, `pendingRelease`, domeno neatitiktis ir timeout. Naujos prenumeratos, domeno pirkimo, stebėjimo daemon, WHOIS asmens duomenų, paskyros ar DNS nereikia. 1 valanda yra limitas, ne kainos pažadas.

Saugojami tik domenas, pirminė būsena, patikros UTC laikas, šaltinis ir interpretacija. Tik tiksliai sutampantis domenas su `available` yra vienkartinės patikros kandidatas registravimui; tai nėra rezervacija ar nuosavybė. `pendingRelease`, `registered`, nepažįstama būsena, neatitiktis ir timeout nėra laisvi. Pirkimo momentu reikės atskiros aktualios registratoriaus patikros bei pirkimo mandato. Vardų/teisių ir perleidimo 30 dienų ribos nepakeičiamos DAS rezultatu.

Priėmimas: visi penki sintetiniai atvejai turi teisingą rezultatą; realios iki 10 užklausų turi atsekamą būseną arba UNVERIFIED; laikas/šaltinis užfiksuoti; nepadaryta jokia rašymo operacija registre. Patikrų skaičius nėra verslo paklausa. Ryšio klaidų nebuvimo nežadame.

Stabdyti pasiekus valandą / 10 vardų, ryšio blokavimą, neaiškią protokolo semantiką, naują finansinę/prieigos priklausomybę ar konfliktą su kito vykdytojo failais. Integracija į domain-sorter, GUI, TOP1 000 ar nuolatinį worker neįeina: ją vertinti tik po kvito ir failų koordinavimo. Neplanuojama keisti kitų TLD taisyklių.

Šiame cikle išsaugotas tik pasiūlymas. Laboratorija ir realios TCP užklausos **neatliktos**; sutaupytas kapitalas, faktinės kainos, našumas ir .lt dalis visame sąraše nežinomi.
