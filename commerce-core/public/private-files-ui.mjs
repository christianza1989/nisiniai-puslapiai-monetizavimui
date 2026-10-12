export function renderPrivateFiles(content, detail, ctx) {
  const { node, table, cell, action, has, binary, reload, date } = ctx;
  content.append(node('h2', {}, 'Privatūs užsakymo failai'));
  content.append(
    node(
      'p',
      { class: 'hint' },
      'PDF priedai saugomi su užsakymu. Priedo įkėlimas nepatvirtina mokėjimo ar siuntos registravimo.',
    ),
  );
  if (!detail.files?.length) content.append(node('p', { class: 'empty' }, 'Failų dar nėra.'));
  else
    content.append(
      table(
        ['Failas', 'Dydis', 'Įkėlimo laikas', 'Veiksmas'],
        detail.files.map((file) => {
          const download = node('button', { type: 'button' }, 'Atsisiųsti');
          download.addEventListener('click', () =>
            action(
              download,
              async () => {
                const blob = await binary('/api/operator/files/' + file.id);
                const url = URL.createObjectURL(blob),
                  link = node('a', { href: url, download: file.filename });
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              },
              'Failas paruoštas atsisiųsti.',
            ),
          );
          return node(
            'tr',
            {},
            cell(file.filename, 'Failas'),
            cell(Math.ceil(file.byte_length / 1024) + ' KB', 'Dydis'),
            cell(date(file.created_at), 'Įkėlimo laikas'),
            cell(download, 'Veiksmas'),
          );
        }),
      ),
    );
  if (!has('document')) return;
  const input = node('input', {
    type: 'file',
    accept: 'application/pdf,.pdf',
    required: true,
    name: 'private-file',
  });
  const submit = node('button', { type: 'submit' }, 'Įkelti PDF');
  const form = node(
    'form',
    { class: 'stock-form' },
    node('label', {}, 'PDF failas, iki 2 MB', input),
    submit,
  );
  let id;
  input.addEventListener('change', () => {
    id = undefined;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    action(
      submit,
      async () => {
        const file = input.files?.[0];
        if (!file || file.size > 2 * 1024 * 1024) throw new Error('file_too_large');
        id ||= crypto.randomUUID();
        let filename = file.name
          .normalize('NFKD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^A-Za-z0-9_.-]/g, '_')
          .slice(0, 95);
        if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';
        await binary('/api/operator/orders/' + detail.order.id + '/files/' + id, {
          method: 'POST',
          headers: { 'content-type': 'application/pdf', 'x-file-name': filename },
          body: file,
        });
        await reload();
      },
      'PDF išsaugotas privačiai.',
    );
  });
  content.append(form);
}
