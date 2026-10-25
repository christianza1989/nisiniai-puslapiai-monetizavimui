// Structured CLI failures outrank incidental stderr diagnostics. No retry here.
export function generatorFailure(stdout, stderr) {
  const errors = [];
  for (const line of String(stdout || '').split(/\r?\n/)) {
    try {
      const event = JSON.parse(line);
      const message = event.type === 'turn.failed' ? event.error?.message
        : event.type === 'error' ? event.message : null;
      if (typeof message === 'string' && message.trim()) errors.push(message.trim());
    } catch { /* Non-JSON CLI output remains a legacy fallback. */ }
  }
  return errors.length ? errors.at(-1).slice(0, 1400) : String(stderr || stdout || 'No diagnostic output.').slice(-1400);
}
