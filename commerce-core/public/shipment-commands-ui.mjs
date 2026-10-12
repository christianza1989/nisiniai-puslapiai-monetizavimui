export function renderShipmentCommands(content, detail, ctx) {
  const { node, api, action, has, money, reload, integrations } = ctx;
  const states = {
    planned: 'Paruošta',
    executing: 'Vykdoma',
    unknown: 'Rezultatas nežinomas',
    registered: 'Siunta užregistruota',
    review: 'Reikia sutikrinti',
    canceled: 'Atšaukta prieš registravimą',
  };
  content.append(node('h2', {}, 'Siuntų registravimo užduotys'));
  if (!detail.shipmentCommands?.length)
    content.append(
      node(
        'p',
        { class: 'empty' },
        'Užduoties dar nėra. Pasirinkite kainų pasiūlymą ir paruoškite registravimą.',
      ),
    );
  for (const c of detail.shipmentCommands || []) {
    content.append(
      node('h3', {}, states[c.state] || c.state),
      node('p', {}, 'Didžiausia vežėjo kaina: ' + money(c.payload.maxCost, c.payload.currency)),
    );
    const button = (label, run, disabled = false) => {
      const b = node('button', { type: 'button', disabled }, label);
      b.addEventListener('click', () =>
        action(
          b,
          async () => {
            await run();
            await reload();
          },
          'Siuntos užduotis atnaujinta.',
        ),
      );
      return b;
    };
    const prefix = '/api/operator/shipment-commands/' + c.id + '/';
    if (c.state === 'planned' && c.first_attempt_at === null)
      content.append(
        node(
          'div',
          { class: 'actions' },
          button(
            'Registruoti paruoštą siuntą',
            () => api(prefix + 'execute', {}),
            !has('ship') || !integrations.shippingBooking,
          ),
          button('Atšaukti paruoštą užduotį', () => api(prefix + 'cancel', {}), !has('ship')),
        ),
      );
    if (['unknown', 'executing', 'review'].includes(c.state)) {
      content.append(
        node(
          'p',
          { class: 'hint' },
          'Registravimo rezultatas turi būti sutikrintas su vežėju. Automatinė pakartotinė siuntos registracija nevykdoma.',
        ),
      );
      if (has('ship')) {
        const providerId = node('input', {
            required: true,
            maxlength: '100',
            pattern: '[a-zA-Z0-9_-]+',
          }),
          reason = node('input', { required: true, minlength: '3', maxlength: '200' }),
          submit = node(
            'button',
            { type: 'submit', disabled: !integrations.shippingBooking },
            'Sutikrinti su vežėju',
          );
        const form = node(
          'form',
          { class: 'stock-form' },
          node('label', {}, 'Siuntos ID vežėjo paskyroje', providerId),
          node('label', {}, 'Sutikrinimo paaiškinimas', reason),
          submit,
        );
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          action(
            submit,
            async () => {
              await api(prefix + 'reconcile', {
                providerId: providerId.value,
                reason: reason.value,
              });
              await reload();
            },
            'Siunta sutikrinta su vežėjo duomenimis.',
          );
        });
        content.append(form);
      }
    }
    if (c.state === 'registered')
      content.append(
        node('p', {}, 'Vežėjo siuntos ID: ' + c.provider_id),
        button(
          'Gauti PDF ir sekimo įvykius',
          () => api(prefix + 'refresh', {}),
          !has('ship') || !integrations.shippingBooking,
        ),
      );
  }
  if (detail.tracking?.length) {
    content.append(node('h3', {}, 'Vežėjo sekimo įvykiai'));
    for (const event of detail.tracking)
      content.append(
        node('p', {}, [event.providerDate, event.text, event.location].filter(Boolean).join(' · ')),
      );
  }
}
