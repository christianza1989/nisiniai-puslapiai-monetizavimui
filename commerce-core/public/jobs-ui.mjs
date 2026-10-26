export async function renderJobs(content, ctx) {
  const { node, table, cell, api, action, has, date } = ctx;
  const data = await api('/api/operator/automation');
  if (!content.isConnected) return;
  const settings = data.notificationSettings;
  if (settings) {
    const pairs = [
      ['Laiškų siuntėjas', settings.sender || 'Nenustatytas'],
      ['Automatinis laiškų siuntimas', settings.sending ? 'Įjungtas' : 'Išjungtas'],
    ];
    if (settings.recovery)
      pairs.push(
        ['Apmokėjimo laikas', settings.recovery.reservationHours + ' val.'],
        ['Vienas priminimas', 'Po ' + settings.recovery.reminderAfterHours + ' val.'],
      );
    content.append(
      node(
        'section',
        { class: 'detail-surface' },
        node('h2', {}, 'Paštas ir apmokėjimas'),
        node(
          'dl',
          {},
          pairs.flatMap(([k, v]) => [node('dt', {}, k), node('dd', {}, v)]),
        ),
      ),
    );
  }
  content.append(
    node(
      'p',
      { class: 'hint' },
      'Vidiniai darbai formuoja dokumentus, tikrina mokėjimų įvykius ir atlaisvina pasibaigusias rezervacijas. Paruoštas pranešimas dar nereiškia, kad laiškas išsiųstas.',
    ),
  );
  const run = node(
    'button',
    { type: 'button', disabled: !has('operate') },
    'Vykdyti laukiančius darbus',
  );
  run.addEventListener('click', () =>
    action(
      run,
      async () => {
        await api('/api/operator/automation/run', {});
        await renderJobsAgain();
      },
      'Vidiniai darbai patikrinti.',
    ),
  );
  content.append(run, node('h2', {}, 'Įvykių užduotys'));
  const names = {
    pending: 'Laukia',
    leased: 'Vykdoma',
    done: 'Baigta',
    waiting: 'Laukia pakartojimo',
    dead: 'Reikia pataisyti',
  };
  if (!data.outbox.length) content.append(node('p', { class: 'empty' }, 'Užduočių dar nėra.'));
  else
    content.append(
      table(
        ['Įvykis', 'Būsena', 'Bandymai', 'Pakartojimas', 'Veiksmas'],
        data.outbox.map((e) => {
          const retry = node(
            'button',
            { type: 'button', disabled: !has('operate') || e.deliveryState !== 'dead' },
            'Pakartoti po pataisymo',
          );
          retry.addEventListener('click', () =>
            action(
              retry,
              async () => {
                await api('/api/operator/automation/' + e.id + '/retry', {});
                await renderJobsAgain();
              },
              'Užduotis grąžinta į eilę.',
            ),
          );
          return node(
            'tr',
            {},
            cell(e.kind, 'Įvykis'),
            cell(names[e.deliveryState || e.state] || e.state, 'Būsena'),
            cell(e.attempts, 'Bandymai'),
            cell(e.next_attempt_at ? date(e.next_attempt_at) : '—', 'Pakartojimas'),
            cell(e.deliveryState === 'dead' ? retry : e.last_error || '—', 'Veiksmas'),
          );
        }),
      ),
    );
  content.append(node('h2', {}, 'Pranešimų ruošiniai'));
  if (!data.notifications.length)
    content.append(node('p', { class: 'empty' }, 'Pranešimų dar nėra.'));
  else
    content.append(
      table(
        ['Pranešimas', 'Būsena', 'Paruošta', 'Veiksmas'],
        data.notifications.map((n) => {
          const preview = node('button', { type: 'button' }, 'Peržiūrėti');
          preview.addEventListener('click', () =>
            action(
              preview,
              async () => {
                const result = await api('/api/operator/notifications/' + n.event_id);
                const message = result.message;
                const box = node(
                  'section',
                  {},
                  node('h3', {}, message.subject),
                  node('p', {}, 'Gavėjas: ' + message.to),
                  node('pre', {}, message.text),
                );
                if (has('operate') && n.state !== 'accepted') {
                  const send = node(
                    'button',
                    { type: 'button' },
                    n.state === 'prepared'
                      ? 'Perduoti patvirtintam transportui'
                      : 'Sutikrinti rezultatą',
                  );
                  const resultText = node('p', { role: 'status' });
                  send.addEventListener('click', () =>
                    action(
                      send,
                      async () => {
                        const r = await api(
                          '/api/operator/notifications/' + n.event_id + '/execute',
                          {},
                        );
                        resultText.textContent =
                          r.state === 'accepted'
                            ? 'Pašto transportas priėmė pranešimą.'
                            : 'Rezultatas dar nežinomas. Reikia transporto patvirtinimo; pakartotinis siuntimas nevykdomas.';
                      },
                      'Pranešimo būsena patikrinta.',
                    ),
                  );
                  box.append(send, resultText);
                }
                content.append(box);
              },
              'Pranešimo ruošinys atvertas.',
            ),
          );
          return node(
            'tr',
            {},
            cell(n.kind, 'Pranešimas'),
            cell(
              {
                prepared: 'Paruoštas',
                sending: 'Perduodamas',
                accepted: 'Transportas priėmė',
                unknown: 'Rezultatas nežinomas',
                review: 'Reikia sutikrinti',
              }[n.state],
              'Būsena',
            ),
            cell(date(n.created_at), 'Paruošta'),
            cell(preview, 'Veiksmas'),
          );
        }),
      ),
    );
  async function renderJobsAgain() {
    content.replaceChildren();
    await renderJobs(content, ctx);
  }
}
