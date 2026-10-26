// All data comes from the private API. No demo-data fallback or HTML interpolation.
import { renderFinanceIO } from './finance-io-ui.mjs';
import { renderFinishedStock } from './finished-stock-ui.mjs';
export async function renderBackoffice(content, view, ctx) {
  const { node: n, table, cell, api, action, has, money, date } = ctx;
  const hints = {
    components:
      'Medžiagų partijos ir surinkti rinkiniai apskaitomi atskirai. Rinkinių surinkimas vienu veiksmu nurašo sudėtyje nurodytas medžiagas ir padidina paruoštų prekių likutį.',
    financials:
      'Importuotas šaltinis yra sutikrinimo įrodymas. Jis nepatvirtina mokėjimo ir nesukuria mokestinio įrašo. Mokesčiai, komisiniai ir neatitikimai peržiūrimi atskirai.',
    wholesale:
      'Partnerio kainynas matomas tik administravime. Pasiūlymas galioja 7 dienas; užsakymas vykdomas po apmokėjimo patvirtinimo.',
  };
  content.append(
    n('p', { class: 'hint' }, hints[view]),
    n('p', { class: 'empty' }, 'Įkeliami duomenys…'),
  );
  const data = await api('/api/operator/' + view);
  if (!content.isConnected) return;
  content.replaceChildren(n('p', { class: 'hint' }, hints[view]));
  const refresh = () => renderBackoffice(content, view, ctx);
  const field = (label, name, attrs = {}, options) => {
    const input = options
      ? n(
          'select',
          { id: 'field-' + name, name, ...attrs },
          options.map((o) => n('option', { value: o.value }, o.label)),
        )
      : n('input', { id: 'field-' + name, name, ...attrs });
    return n('div', { class: 'field' }, n('label', { for: 'field-' + name }, label), input);
  };
  const form = (title, fields, label, run) => {
    const id = crypto.randomUUID(),
      button = n('button', { type: 'submit', class: 'primary' }, label);
    const f = n(
      'form',
      {
        class: 'stock-form',
        onsubmit: (event) => {
          event.preventDefault();
          action(
            button,
            async () => {
              await run(Object.fromEntries(new FormData(f)), id);
              await ctx.reload();
              ctx.focusView();
            },
            'Veiksmas išsaugotas.',
          );
        },
      },
      n('h2', {}, title),
      n('div', { class: 'fields' }, fields),
      n('div', { class: 'actions' }, button),
    );
    content.append(f);
    return f;
  };
  if (view === 'components') {
    await renderFinishedStock(content, ctx, refresh);
    const components = data.components;
    content.append(
      n('h2', {}, 'Medžiagos'),
      components.length
        ? table(
            ['Medžiaga', 'Vienetas'],
            components.map((c) =>
              n(
                'tr',
                {},
                cell(c.name, 'Medžiaga'),
                cell(c.unit === 'unit' ? 'vnt.' : c.unit, 'Vienetas'),
              ),
            ),
          )
        : n(
            'p',
            { class: 'empty' },
            'Medžiagų dar nėra. Pirma įrašykite medžiagą ir jos matavimo vienetą.',
          ),
    );
    content.append(
      n('h2', {}, 'Partijos'),
      data.lots.length
        ? table(
            ['Medžiaga', 'Partija', 'Laisvas kiekis', 'Galiojimas', 'Būsena'],
            data.lots.map((l) =>
              n(
                'tr',
                {},
                cell(components.find((c) => c.id === l.component_id)?.name, 'Medžiaga'),
                cell(l.supplier_ref, 'Partija'),
                cell(l.available, 'Laisvas kiekis'),
                cell(l.expires_at ? date(l.expires_at) : 'Nenurodyta', 'Galiojimas'),
                cell(
                  l.quarantined
                    ? 'Karantinas'
                    : l.expires_at && l.expires_at <= Date.now()
                      ? 'Pasibaigęs galiojimas'
                      : 'Tinkama surinkti',
                  'Būsena',
                ),
              ),
            ),
          )
        : n('p', { class: 'empty' }, 'Gautų medžiagų partijų dar nėra.'),
    );
    if (has('stock')) {
      if (data.lots.length) {
        const f = form(
          'Valdyti medžiagų partiją',
          [
            field(
              'Partija',
              'controlLot',
              {},
              data.lots.map((l) => ({
                value: l.id,
                label:
                  l.supplier_ref +
                  ' · ' +
                  (components.find((c) => c.id === l.component_id)?.name ?? l.component_id),
              })),
            ),
            field('Veiksmas', 'controlKind', {}, [
              { value: 'adjust', label: 'Patikslinti likutį po inventorizacijos' },
              { value: 'quarantine', label: 'Perkelti į karantiną' },
              { value: 'release', label: 'Grąžinti iš karantino' },
            ]),
            field('Suskaičiuotas kiekis partijos matavimo vienetu', 'controlCount', {
              type: 'number',
              min: 0,
              max: 100000000,
              step: 1,
              required: true,
            }),
            field('Priežastis', 'controlReason', { required: true, minlength: 3, maxlength: 160 }),
          ],
          'Išsaugoti partijos pakeitimą',
          (v, id) => {
            const lot = data.lots.find((l) => l.id === v.controlLot);
            return api('/api/operator/lot-controls', {
              id,
              lotId: lot.id,
              kind: v.controlKind,
              delta: v.controlKind === 'adjust' ? Number(v.controlCount) - lot.available : 0,
              expectedAvailable: lot.available,
              expectedVersion: lot.control_version,
              reason: v.controlReason,
            });
          },
        );
        const update = () => {
          const lot = data.lots.find((l) => l.id === f.elements.controlLot.value);
          f.elements.controlCount.value = lot.available;
          f.elements.controlCount.disabled = f.elements.controlKind.value !== 'adjust';
        };
        f.elements.controlLot.addEventListener('change', update);
        f.elements.controlKind.addEventListener('change', update);
        update();
      }
      form(
        'Įrašyti medžiagą',
        [
          field('Pavadinimas', 'componentName', { required: true, minlength: 2, maxlength: 160 }),
          field('Matavimo vienetas', 'componentUnit', {}, [
            { value: 'unit', label: 'Vienetai (pvz., pakeliai)' },
            { value: 'g', label: 'Gramai' },
            { value: 'ml', label: 'Mililitrai' },
          ]),
        ],
        'Įrašyti medžiagą',
        (v, id) =>
          api('/api/operator/components', { id, name: v.componentName, unit: v.componentUnit }),
      );
      if (components.length) {
        form(
          'Priimti medžiagų partiją',
          [
            field(
              'Medžiaga',
              'lotComponent',
              {},
              components.map((c) => ({ value: c.id, label: c.name })),
            ),
            field('Tiekėjo partijos numeris', 'supplierRef', {
              required: true,
              minlength: 2,
              maxlength: 160,
            }),
            field('Kiekis pasirinktu matavimo vienetu', 'lotQuantity', {
              type: 'number',
              required: true,
              min: 1,
              step: 1,
              max: 100000000,
            }),
            field('Galiojimo data (nebūtina)', 'lotExpiry', { type: 'date' }),
          ],
          'Priimti partiją',
          (v, id) =>
            api('/api/operator/lots', {
              id,
              componentId: v.lotComponent,
              supplierRef: v.supplierRef,
              quantity: Number(v.lotQuantity),
              expiresAt: v.lotExpiry ? Date.parse(v.lotExpiry + 'T23:59:59Z') : null,
            }),
        );
        form(
          'Išsaugoti rinkinio sudėtį',
          [
            field(
              'Prekė',
              'recipeSku',
              {},
              ctx.catalog.map((p) => ({ value: p.sku, label: p.title })),
            ),
            ...components.map((c, i) =>
              field(
                c.name + ' (' + (c.unit === 'unit' ? 'vnt.' : c.unit) + ') vienam rinkiniui',
                'recipe-' + i,
                { type: 'number', min: 0, step: 1, value: 0, max: 100000000 },
              ),
            ),
          ],
          'Išsaugoti sudėtį',
          (v, id) =>
            api('/api/operator/recipes', {
              id,
              sku: v.recipeSku,
              components: components.flatMap((c, i) =>
                Number(v['recipe-' + i]) > 0
                  ? [{ id: c.id, unit: c.unit, quantity: Number(v['recipe-' + i]) }]
                  : [],
              ),
            }),
        );
      }
      if (data.recipes.length)
        form(
          'Surinkti rinkinius',
          [
            field(
              'Rinkinio sudėtis',
              'assemblyRecipe',
              {},
              data.recipes.map((r) => ({ value: r.id, label: r.sku + ' · ' + r.id.slice(0, 8) })),
            ),
            field('Rinkinių skaičius', 'assemblyQuantity', {
              type: 'number',
              required: true,
              min: 1,
              max: 1000,
              step: 1,
              value: 1,
            }),
          ],
          'Surinkti rinkinius',
          (v, id) =>
            api('/api/operator/assemblies', {
              id,
              recipeId: v.assemblyRecipe,
              quantity: Number(v.assemblyQuantity),
            }),
        );
    }
    content.append(
      n('h2', {}, 'Surinkimo istorija'),
      data.assemblies.length
        ? table(
            ['Prekė', 'Kiekis', 'Laikas'],
            data.assemblies.map((a) =>
              n(
                'tr',
                {},
                cell(a.sku, 'Prekė'),
                cell(a.quantity, 'Kiekis'),
                cell(date(a.created_at), 'Laikas'),
              ),
            ),
          )
        : n('p', { class: 'empty' }, 'Rinkiniai dar nesurinkti.'),
    );
    content.append(
      n('h2', {}, 'Partijų pakeitimai'),
      data.lotControls.length
        ? table(
            ['Partija', 'Veiksmas', 'Kiekio pokytis', 'Priežastis', 'Operatorius', 'Laikas'],
            data.lotControls.map((c) =>
              n(
                'tr',
                {},
                cell(data.lots.find((l) => l.id === c.lot_id)?.supplier_ref ?? c.lot_id, null),
                cell(
                  {
                    adjust: 'Likutis patikslintas',
                    quarantine: 'Perkelta į karantiną',
                    release: 'Grąžinta iš karantino',
                  }[c.kind],
                  'Veiksmas',
                ),
                cell(c.delta, 'Kiekio pokytis'),
                cell(c.reason, 'Priežastis'),
                cell(c.actor_ref, 'Operatorius'),
                cell(date(c.created_at), 'Laikas'),
              ),
            ),
          )
        : n('p', { class: 'empty' }, 'Partijų pakeitimų dar nėra.'),
    );
  }
  if (view === 'financials') {
    renderFinanceIO(content, ctx);
    const labels = {
        payment: 'Mokėjimas',
        refund: 'Grąžinimas',
        fee: 'Komisinis',
        payout: 'Stripe išmoka',
        bank: 'Banko įrašas',
      },
      states = {
        matched: 'Sutikrinta',
        candidate: 'Sumos sutampa',
        exception: 'Neatitikimas',
        unmatched: 'Laukia peržiūros',
      };
    content.append(
      n('h2', {}, 'Finansiniai šaltiniai'),
      n(
        'p',
        { class: 'hint' },
        'Rodomi iki 100 naujausių šaltinių. Sutikrinimas nesukuria išmokos, banko operacijos ar mokesčių deklaracijos.',
      ),
    );
    content.append(
      data.sources.length
        ? table(
            ['Šaltinis', 'Rūšis', 'Suma', 'Būsena', 'Veiksmas'],
            data.sources.map((s) => {
              let button = '—';
              if (has('finance') && s.state === 'candidate') {
                button = n(
                  'button',
                  {
                    type: 'button',
                    onclick: () =>
                      action(
                        button,
                        async () => {
                          await api('/api/operator/reconciliations', { sourceId: s.id });
                          await refresh();
                          ctx.focusView();
                        },
                        'Šaltinis sutikrintas.',
                      ),
                  },
                  'Sutikrinti',
                );
              }
              return n(
                'tr',
                {},
                cell(n('div', {}, s.reference, n('span', { class: 'secondary' }, s.origin)), null),
                cell(labels[s.kind], 'Rūšis'),
                cell(money(s.amount, s.currency), 'Suma'),
                cell(states[s.state], 'Būsena'),
                cell(button, 'Veiksmas'),
              );
            }),
          )
        : n('p', { class: 'empty' }, 'Finansinių šaltinių dar neimportuota.'),
    );
    if (has('finance')) {
      form(
        'Įrašyti šaltinio eilutę',
        [
          field('Šaltinio sistema', 'origin', {
            required: true,
            pattern: '[a-zA-Z0-9_-]{1,100}',
            value: 'stripe_balance',
          }),
          field('Originalaus įrašo ID', 'reference', {
            required: true,
            pattern: '[a-zA-Z0-9_-]{1,100}',
          }),
          field(
            'Rūšis',
            'kind',
            {},
            Object.entries(labels).map(([value, label]) => ({ value, label })),
          ),
          field('Valiuta', 'currency', {
            required: true,
            pattern: '[A-Z]{3}',
            maxlength: 3,
            value: 'EUR',
          }),
          field('Suma mažiausiais valiutos vienetais (centais)', 'amount', {
            type: 'number',
            required: true,
            step: 1,
            min: -100000000,
            max: 100000000,
          }),
          field('Stripe mokėjimo, grąžinimo arba išmokos ID', 'transactionRef', {
            pattern: '[a-zA-Z0-9_-]{1,100}',
          }),
          field('Operacijos data', 'occurredDate', { type: 'date', required: true }),
        ],
        'Įrašyti šaltinį',
        (v) =>
          api('/api/operator/financial-imports', {
            origin: v.origin,
            rows: [
              {
                reference: v.reference,
                kind: v.kind,
                currency: v.currency,
                amount: Number(v.amount),
                transactionRef: v.transactionRef || null,
                occurredAt: Date.parse(v.occurredDate + 'T12:00:00Z'),
              },
            ],
          }),
      );
      const payouts = data.sources.filter((s) => s.kind === 'payout' && s.state !== 'matched'),
        banks = data.sources.filter((s) => s.kind === 'bank' && s.state !== 'matched');
      if (payouts.length && banks.length)
        form(
          'Sutikrinti išmoką su banku',
          [
            field(
              'Stripe išmoka',
              'payoutSource',
              {},
              payouts.map((s) => ({
                value: s.id,
                label: s.reference + ' · ' + money(s.amount, s.currency),
              })),
            ),
            field(
              'Banko įrašas',
              'bankSource',
              {},
              banks.map((s) => ({
                value: s.id,
                label: s.reference + ' · ' + money(s.amount, s.currency),
              })),
            ),
          ],
          'Sutikrinti išmoką',
          (v) =>
            api('/api/operator/reconciliations', {
              sourceId: v.payoutSource,
              peerId: v.bankSource,
            }),
        );
    }
  }
  if (view === 'wholesale') {
    content.append(
      n('h2', {}, 'Partneriai'),
      data.partners.length
        ? table(
            ['Partneris', 'Rinka', 'Kainynas', 'Būsena', 'Veiksmas'],
            data.partners.map((p) => {
              let button = '—';
              if (has('wholesale')) {
                const id = crypto.randomUUID();
                button = n(
                  'button',
                  {
                    type: 'button',
                    onclick: () =>
                      action(
                        button,
                        async () => {
                          await api('/api/operator/wholesale-approvals', {
                            id,
                            partnerId: p.id,
                            expectedVersion: p.approval_version,
                            approved: !p.approved,
                          });
                          await refresh();
                          ctx.focusView();
                        },
                        'Partnerio būsena išsaugota.',
                      ),
                  },
                  p.approved ? 'Stabdyti prekybą' : 'Patvirtinti partnerį',
                );
              }
              return n(
                'tr',
                {},
                cell(p.name, null),
                cell(p.country + ' / ' + p.currency, 'Rinka'),
                cell(p.price_list_id, 'Kainynas'),
                cell(p.approved ? 'Patvirtintas' : 'Nepatvirtintas', 'Būsena'),
                cell(button, 'Veiksmas'),
              );
            }),
          )
        : n(
            'p',
            { class: 'empty' },
            'Partnerių dar nėra. Išsaugokite kainyną, tada įrašykite partnerį ir patvirtinkite prekybą.',
          ),
    );
    const partners = data.partners.filter((p) => p.approved),
      { markets } = await api('/api/markets');
    if (has('wholesale')) {
      form(
        'Sukurti kainyno versiją',
        [
          field('Kainyno žymuo (raidės, skaičiai, brūkšniai)', 'listId', {
            required: true,
            pattern: '[a-zA-Z0-9_-]{1,100}',
            maxlength: 100,
          }),
          field(
            'Valiuta',
            'listCurrency',
            {},
            [...new Set(markets.map((m) => m.currency))].map((value) => ({ value, label: value })),
          ),
          ...ctx.catalog.flatMap((p, i) => [
            field(p.title + ' — vieneto kaina centais (0: neįtraukti)', 'price-' + i, {
              type: 'number',
              min: 0,
              max: 100000000,
              step: 1,
              value: 0,
            }),
            field(p.title + ' — minimalus kiekis', 'moq-' + i, {
              type: 'number',
              min: 1,
              max: 100,
              step: 1,
              value: 2,
            }),
            field(p.title + ' — pakuotės kiekis', 'casepack-' + i, {
              type: 'number',
              min: 1,
              max: 100,
              step: 1,
              value: 2,
            }),
          ]),
        ],
        'Išsaugoti kainyną',
        (v) =>
          api('/api/operator/wholesale-price-lists', {
            id: v.listId,
            currency: v.listCurrency,
            lines: ctx.catalog.flatMap((p, i) =>
              Number(v['price-' + i]) > 0
                ? [
                    {
                      sku: p.sku,
                      unitAmount: Number(v['price-' + i]),
                      moq: Number(v['moq-' + i]),
                      casepack: Number(v['casepack-' + i]),
                    },
                  ]
                : [],
            ),
          }),
      );
      if (data.priceLists.length) {
        const f = form(
          'Įrašyti partnerį',
          [
            field('Juridinis įmonės pavadinimas', 'partnerName', {
              required: true,
              minlength: 2,
              maxlength: 120,
            }),
            field('Įmonės / verslo registracijos kodas', 'partnerCompanyCode', {
              required: true,
              minlength: 3,
              maxlength: 40,
            }),
            field('PVM kodas, jei yra', 'partnerVatCode', { maxlength: 40 }),
            field(
              'Rinka',
              'partnerMarket',
              {},
              markets.map((m, i) => ({ value: String(i), label: m.country + ' / ' + m.currency })),
            ),
            field('Kainynas', 'partnerList', {}, []),
            field('Kontaktinio asmens vardas', 'partnerContact', {
              required: true,
              minlength: 2,
              maxlength: 120,
            }),
            field('El. paštas', 'partnerEmail', { type: 'email', required: true, maxlength: 254 }),
            field('Telefonas su šalies kodu', 'partnerPhone', {
              type: 'tel',
              required: true,
              pattern: '[+][1-9][0-9]{7,14}',
            }),
            field('Adresas', 'partnerAddress', { required: true, minlength: 2, maxlength: 200 }),
            field('Miestas', 'partnerCity', { required: true, minlength: 2, maxlength: 100 }),
            field('Pašto kodas', 'partnerPostal', { required: true, maxlength: 16 }),
          ],
          'Išsaugoti nepatvirtintą partnerį',
          (v, id) => {
            const m = markets[Number(v.partnerMarket)];
            return api('/api/operator/wholesale-partners', {
              id,
              name: v.partnerName,
              priceListId: v.partnerList,
              country: m.country,
              currency: m.currency,
              approved: false,
              customer: {
                name: v.partnerName,
                contactName: v.partnerContact,
                isCompany: true,
                companyCode: v.partnerCompanyCode,
                ...(v.partnerVatCode ? { vatCode: v.partnerVatCode } : {}),
                email: v.partnerEmail,
                phone: v.partnerPhone,
                address: {
                  country: m.country,
                  line1: v.partnerAddress,
                  city: v.partnerCity,
                  postalCode: v.partnerPostal,
                },
              },
            });
          },
        );
        const update = () => {
          const market = markets[Number(f.elements.partnerMarket.value)];
          f.elements.partnerList.replaceChildren(
            ...data.priceLists
              .filter((l) => l.currency === market.currency)
              .map((l) => n('option', { value: l.id }, l.id)),
          );
          f.elements.partnerList.required = true;
          f.querySelector('button[type="submit"]').disabled =
            !f.elements.partnerList.options.length;
        };
        f.elements.partnerMarket.addEventListener('change', update);
        update();
      }
    }
    if (has('wholesale') && partners.length) {
      // A partner-specific delivery selector is populated from the server market.
      const f = form(
        'Parengti pasiūlymą',
        [
          field(
            'Partneris',
            'quotePartner',
            {},
            partners.map((p) => ({ value: p.id, label: p.name })),
          ),
          field('Prekė', 'quoteSku', {}, []),
          field('Kiekis (pagal kainyno minimumą ir pakuotę)', 'quoteQuantity', {
            type: 'number',
            required: true,
            min: 1,
            max: 100,
            step: 1,
            value: 2,
          }),
          field('Pristatymas', 'quoteDelivery', {}, []),
        ],
        'Parengti pasiūlymą',
        (v, id) =>
          api('/api/operator/wholesale-quotes', {
            id,
            partnerId: v.quotePartner,
            lines: [{ sku: v.quoteSku, quantity: Number(v.quoteQuantity) }],
            deliveryId: v.quoteDelivery,
          }),
      );
      const update = () => {
        const p = partners.find((p) => p.id === f.elements.quotePartner.value),
          market = markets.find((m) => m.country === p.country && m.currency === p.currency);
        f.elements.quoteDelivery.replaceChildren(
          ...(market?.delivery ?? [])
            .filter((d) => d.kind !== 'locker')
            .map((d) => n('option', { value: d.id }, d.label)),
        );
        const list = data.priceLists.find((l) => l.id === p.price_list_id);
        f.elements.quoteSku.replaceChildren(
          ...(list?.definition.lines ?? []).map((l) =>
            n('option', { value: l.sku }, ctx.catalog.find((c) => c.sku === l.sku)?.title ?? l.sku),
          ),
        );
      };
      f.elements.quotePartner.addEventListener('change', update);
      update();
    }
    content.append(n('h2', {}, 'Kainynai'));
    for (const list of data.priceLists)
      content.append(
        n('h3', {}, list.id),
        table(
          ['Prekė', 'Vieneto kaina', 'Minimumas', 'Pakuotės kiekis'],
          list.definition.lines.map((l) =>
            n(
              'tr',
              {},
              cell(l.sku, null),
              cell(money(l.unitAmount, list.currency), 'Vieneto kaina'),
              cell(l.moq, 'Minimumas'),
              cell(l.casepack, 'Pakuotės kiekis'),
            ),
          ),
        ),
      );
    content.append(
      n('h2', {}, 'Pasiūlymai'),
      data.quotes.length
        ? table(
            ['Pasiūlymas', 'Partneris', 'Suma', 'Galioja iki', 'Veiksmai'],
            data.quotes.map((q) => {
              const buttons = [];
              if (has('wholesale')) {
                if (!q.order_id && q.expires_at > Date.now()) {
                  const b = n(
                    'button',
                    {
                      type: 'button',
                      onclick: () =>
                        action(
                          b,
                          async () => {
                            await api('/api/operator/wholesale-quotes/' + q.id + '/accept', {});
                            await ctx.reload();
                            ctx.focusView();
                          },
                          'Didmenos užsakymas sukurtas.',
                        ),
                    },
                    'Kurti užsakymą',
                  );
                  buttons.push(b);
                }
                const id = crypto.randomUUID(),
                  b = n(
                    'button',
                    {
                      type: 'button',
                      onclick: () =>
                        action(
                          b,
                          async () => {
                            await api('/api/operator/wholesale-reorders', { id, quoteId: q.id });
                            await refresh();
                            ctx.focusView();
                          },
                          'Parengtas naujas pasiūlymas.',
                        ),
                    },
                    'Pakartoti pasiūlymą',
                  );
                buttons.push(b);
              }
              return n(
                'tr',
                {},
                cell(q.id.slice(0, 8), null),
                cell(q.snapshot.wholesale.partnerName, 'Partneris'),
                cell(money(q.snapshot.amount, q.snapshot.currency), 'Suma'),
                cell(date(q.expires_at), 'Galioja iki'),
                cell(
                  n('div', { class: 'actions' }, q.order_id ? 'Užsakymas sukurtas' : null, buttons),
                  'Veiksmai',
                ),
              );
            }),
          )
        : n('p', { class: 'empty' }, 'Didmenos pasiūlymų dar nėra.'),
    );
  }
}
