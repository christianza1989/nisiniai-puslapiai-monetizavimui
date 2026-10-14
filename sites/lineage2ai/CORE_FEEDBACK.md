# Facebook API įgyvendinimo patirtis

2026-10-14. Bendrame modulyje nebuvo oficialaus Page siuntėjo: legacy `/actions/{id}/send` visada grąžino 503. Savininko naujai užsakytam API pridėtas bendras, nuo domeno nepriklausomas transportas ir durable eilė. Upgrade `aeaa2ac8-6c85-47e3-81a7-6373e9a829b8`, issue146 / PR135.

Mišraus API / desktop darbo regresija atkūrė bendros kvotos klaidą: po API bandymo desktop dar leido naują claimed užduotį, nors limitas buvo 1. Pataisytas abiejų transportų bandymų skaičiavimas. Originalus FAIL išlaikytas [patikroje](../../docs/FACEBOOK_PAGE_API_CHECK_2026-10-14.md); upgrade `06e6ba33-e9fb-4262-9576-ed0531b68e1d`.

Pakeitimai patikrinti izoliuotai; main merge, actual runtime prieiga ir tikra publikacija dar nepriimti. Jokio komercinio rezultato, Page tokeno, žmogaus duomenų ar raw Facebook ekrano čia nėra. [TOOLS](TOOLS.md) atskiria pasirinktą core, katalogo alternatyvas, kainas ir gyvą priklausomybę.
