// Pure body accessors shared by package validation and runtime review gates.
// Importing review/readiness must not evaluate filesystem schema loading.
export function inlineNodes(page){return page.body.flatMap(b=>b.content||((b.type==='richList')?b.items.flat():[]));}
export function bodyPlainText(body){return body.map(b=>b.text??(b.content?b.content.map(n=>n.text).join(''):b.type==='richList'?b.items.map(row=>row.map(n=>n.text).join('')).join('\n'):b.items?.join('\n')||'')).join('\n');}
