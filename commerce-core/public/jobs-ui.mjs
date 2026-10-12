export async function renderJobs(content, ctx) {
  const { node, table, cell, api, action, has, date } = ctx;
  const data = await api('/api/operator/automation');
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
        ['Pranešimas', 'Būsena', 'Paruošta'],
        data.notifications.map((n) =>
          node(
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
          ),
        ),
      ),
    );
  async function renderJobsAgain() {
    content.replaceChildren();
    await renderJobs(content, ctx);
  }
}
