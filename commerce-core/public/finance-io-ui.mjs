export function renderFinanceIO(content, ctx) {
  const { node: n, api, action, has, binary, reload } = ctx;
  content.append(
    n('h2', {}, 'Finansinių duomenų importas ir eksportas'),
    n(
      'p',
      { class: 'hint' },
      'Eksporto sumos pateikiamos mažiausiais valiutos vienetais: EUR centais. Valiutos nesumuojamos tarpusavyje. Importas išsaugo šaltinį ir nesukuria mokėjimo ar mokestinio įrašo.',
    ),
  );
  if (!has('finance')) return;
  const exportButtons = ['financials', 'documents', 'journals'].map((kind, i) => {
    const b = n(
      'button',
      { type: 'button' },
      ['Finansiniai šaltiniai CSV', 'Dokumentai CSV', 'Žurnalas CSV'][i],
    );
    b.addEventListener('click', () =>
      action(
        b,
        async () => {
          const blob = await binary('/api/operator/financial-exports/' + kind),
            url = URL.createObjectURL(blob);
          n('a', { href: url, download: kind + '.csv' }).click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        },
        'Eksportas paruoštas.',
      ),
    );
    return b;
  });
  content.append(n('div', { class: 'actions' }, exportButtons));
  const stripe = n('button', { type: 'button' }, 'Importuoti Stripe šaltinių puslapį'),
    after = n('input', { maxlength: '100', placeholder: 'txn_...; pirmam puslapiui tuščia' }),
    stripeStatus = n('p', { role: 'status' });
  stripe.addEventListener('click', () =>
    action(
      stripe,
      async () => {
        const result = await api(
          '/api/operator/financial-stripe',
          after.value ? { after: after.value } : {},
        );
        after.value = result.next || '';
        stripeStatus.textContent = result.complete
          ? 'Šaltinių peržiūra baigta.'
          : 'Dar yra šaltinių. Tęskite tuo pačiu puslapio žymeniu.';
      },
      'Stripe šaltiniai išsaugoti.',
    ),
  );
  content.append(n('label', {}, 'Stripe kito puslapio žymuo', after), stripe, stripeStatus);
  const origin = n('input', { required: true, pattern: '[a-zA-Z0-9_-]+', maxlength: '100' }),
    csv = n('textarea', { required: true, rows: '7', maxlength: '50000', spellcheck: 'false' });
  const keys = ['reference', 'kind', 'currency', 'amount', 'occurredAt', 'transactionRef'],
    columns = Object.fromEntries(
      keys.map((key) => [
        key,
        n('input', { value: key, required: key !== 'transactionRef', maxlength: '150' }),
      ]),
    );
  const submit = n('button', { type: 'submit' }, 'Importuoti CSV'),
    form = n(
      'form',
      { class: 'stock-form' },
      n('h3', {}, 'Normalizuotas banko / finansų CSV'),
      n(
        'p',
        { class: 'hint' },
        'Iki 100 eilučių, EUR arba PLN. Sumos su tašku ir iki 2 skaitmenų po jo. Datos ISO formatu su Z laiko zona. Rūšys: payment, refund, fee, payout, bank. Stulpelių pavadinimus galima priskirti žemiau.',
      ),
      n('label', {}, 'Šaltinio žymuo', origin),
      n('label', {}, 'CSV tekstas', csv),
      keys.map((key) => n('label', {}, key + ' stulpelis', columns[key])),
      submit,
    );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      submit,
      async () => {
        await api('/api/operator/financial-csv', {
          origin: origin.value,
          text: csv.value,
          mapping: Object.fromEntries(
            keys.filter((key) => columns[key].value).map((key) => [key, columns[key].value]),
          ),
        });
        await reload();
      },
      'CSV šaltinis ir jo eilutės išsaugoti.',
    );
  });
  content.append(form);
}
