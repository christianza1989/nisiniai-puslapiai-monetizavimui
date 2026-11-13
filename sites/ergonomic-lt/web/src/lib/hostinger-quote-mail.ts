const apiOrigin = 'https://api.mail.hostinger.com/api/v1';
export const quoteMailSender = 'kontaktuforma@kontaktuforma.lt';
export const previewQuoteRecipient = 'ergonomic@ergonomic.lt';

type QuoteMail = { id: string; to: string; customerEmail: string; subject: string; text: string };
type Mailbox = { resourceId?: string; address?: string };
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function useHostingerQuoteMail() {
  return process.env.LAUNCH_SITE !== 'true' && process.env.PREVIEW_CATALOG === 'true' &&
    process.env.QUOTE_MAIL_TRANSPORT === 'hostinger_api';
}

// Do not retry an attempted send when the acknowledgement was lost.
export class HostingerQuoteDeliveryUnknown extends Error {}

export async function sendHostingerQuoteMail(apiKey: string, message: QuoteMail, fetcher = fetch) {
  if (!apiKey || message.to !== previewQuoteRecipient) throw Error('mail_api_not_configured');
  const authorization = { Authorization: 'Bearer ' + apiKey };
  const account = await fetcher(apiOrigin + '/me', {
    headers: { ...authorization, Accept: 'application/json' },
    redirect: 'manual',
    signal: AbortSignal.timeout(12_000)
  });
  if (account.status !== 200) throw Error('mail_api_account_unavailable');
  const { data } = await account.json() as { data?: { mailboxes?: Mailbox[] } };
  const mailboxes = data?.mailboxes?.filter(mailbox => mailbox.address === quoteMailSender);
  const mailboxId = mailboxes?.length === 1 ? mailboxes[0].resourceId : undefined;
  if (!mailboxId || !/^[A-Za-z0-9]{1,160}$/.test(mailboxId)) throw Error('mail_api_sender_mismatch');

  // Hostinger's JSON send endpoint does not accept a Reply-To header.
  const text = message.text + '\n\nAtsakyti klientui: ' + message.customerEmail + '\n\nPranešimo identifikatorius: ' + message.id;
  const replyLink = escapeHtml('mailto:' + encodeURIComponent(message.customerEmail).replace('%40', '@'));
  const html = '<p><a href="' + replyLink + '">Atsakyti klientui</a></p><div style="white-space:pre-wrap">' + escapeHtml(text) + '</div>';

  let response: Response;
  try {
    response = await fetcher(apiOrigin + '/mailboxes/' + mailboxId + '/send', {
      method: 'POST',
      redirect: 'manual',
      signal: AbortSignal.timeout(12_000),
      headers: { ...authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: [message.to], displayName: 'Ergonomic.lt', subject: message.subject, text, html })
    });
  } catch {
    throw new HostingerQuoteDeliveryUnknown();
  }
  if (response.status === 204) return;
  if (response.status >= 500 || response.status === 408 || response.status === 200 || response.status === 202) {
    throw new HostingerQuoteDeliveryUnknown();
  }
  throw Error('mail_api_not_accepted');
}
