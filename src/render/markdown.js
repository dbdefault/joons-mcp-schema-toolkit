import {safeRenderValue} from '../output/report.js';
const escape = text => String(text).replace(/[\\`*_{}\[\]()#+.!|<>~-]/g, '\\$&');
export function renderMarkdown(value) {
  value = safeRenderValue(value);
  if (value.format === 'joons-mcp-schema-toolkit/subset') return ['# Subset', '', `Format: ${escape(value.format)}; schema version: ${value.schemaVersion}`, '', ...['supported','annotations','unsupported'].map(k => `- ${escape(k)} (${value[k].length}): ${value[k].map(escape).join(', ')}`), `- Unknown keyword policy: ${escape(value.unknownKeywordPolicy)}`, ''].join('\n');
  const s = value.summary;
  const lines = [`# ${escape(value.command)}: ${escape(value.status)}`, '', `Format: ${escape(value.format)}; schema version: ${value.schemaVersion}`, `Tool: ${escape(value.tool.name)} ${escape(value.tool.version)}`, '', `Tools: ${s.tools}; schemas: ${s.schemas}; invalid: ${s.invalid}; incomplete: ${s.incomplete}; findings: ${s.findings}`, '', `Example written: ${value.exampleWritten}`];
  for (const r of value.results) { lines.push('', `## ${escape(r.tool)} ${escape(r.kind)}: ${escape(r.status)}`); for (const f of r.findings) lines.push(`- ${escape(f.level)} ${escape(f.code)} ${escape(f.path || '/')}: ${escape(f.message)}`); }
  return lines.join('\n') + '\n';
}
