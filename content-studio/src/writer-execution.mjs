// Explicit per-process selection; never inherit a GUI label as execution proof.
export function writerSelection(environment = process.env) {
  const model = environment.STUDIO_CODEX_MODEL?.trim() || null;
  const reasoningEffort = environment.STUDIO_CODEX_REASONING_EFFORT?.trim() || null;
  if (model && !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(model)) throw new Error('Invalid studio writer model.');
  if (reasoningEffort && !['none','minimal','low','medium','high','xhigh','max','ultra'].includes(reasoningEffort)) throw new Error('Invalid studio writer reasoning effort.');
  if (reasoningEffort && !model) throw new Error('Set an explicit studio writer model with its reasoning effort.');
  return { model, reasoningEffort, selection: model ? 'explicit' : 'cli-default-unverified' };
}
export function writerArguments(selection) {
  return [...(selection.model ? ['--model', selection.model] : []),
    ...(selection.reasoningEffort ? ['-c', `model_reasoning_effort="${selection.reasoningEffort}"`] : [])];
}
export function writerReceipt(selection, output) {
  const header = `${output.stderrHeader || ''}\n${output.stderr || ''}\n${output.stdout || ''}`;
  const reportedModel = header.match(/^model:\s*(\S+)\s*$/m)?.[1] || null;
  const reportedEffort = header.match(/^reasoning effort:\s*(\S+)\s*$/m)?.[1] || null;
  if (selection.model && reportedModel && reportedModel !== selection.model) throw new Error('Writer reported a different model than requested.');
  if (selection.reasoningEffort && reportedEffort && reportedEffort !== selection.reasoningEffort) throw new Error('Writer reported a different reasoning effort than requested.');
  return { ...selection, reportedModel, reportedEffort, status: reportedModel ? 'cli-header-observed' : 'arguments-recorded-runtime-unverified', completedAt: new Date().toISOString() };
}
