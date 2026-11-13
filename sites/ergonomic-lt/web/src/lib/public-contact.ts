export const defaultContactEmail = 'info@ergonomic.lt';
export const secondaryContactEmail = 'ergonomic@azprekyba.lt';

export function publicContactEmails() {
  const previewEmail = process.env.PUBLIC_ORIGIN === 'https://ergonomic-preview.pinet-azprekyba.workers.dev' &&
    process.env.PREVIEW_CATALOG === 'true' && process.env.LAUNCH_SITE !== 'true'
    ? process.env.PREVIEW_CONTACT_EMAIL : undefined;
  return previewEmail ? { primary: previewEmail } : { primary: defaultContactEmail, secondary: secondaryContactEmail };
}

export function publicContactText(text: string): string {
  const { primary, secondary } = publicContactEmails();
  return secondary ? text : text.replace(/info@ergonomic\.lt|ergonomic@azprekyba\.lt/gi, primary);
}
