import {safeRenderValue} from '../output/report.js';
export function renderTerminal(value) {
  value = safeRenderValue(value);
  if (value.format === 'joons-mcp-schema-toolkit/subset') return [`Format: ${value.format}; schema version: ${value.schemaVersion}`, 'Subset', `Supported (${value.supported.length}): ${value.supported.join(', ')}`, `Annotations (${value.annotations.length}): ${value.annotations.join(', ')}`, `Unsupported (${value.unsupported.length}): ${value.unsupported.join(', ')}`, `Unknown keyword policy: ${value.unknownKeywordPolicy}`, ''].join('\n');
  const s = value.summary;
  const lines = [`Format: ${value.format}; schema version: ${value.schemaVersion}`, `Tool: ${value.tool.name} ${value.tool.version}`, `${value.command}: ${value.status}`, `Tools: ${s.tools}; schemas: ${s.schemas}; invalid: ${s.invalid}; incomplete: ${s.incomplete}; findings: ${s.findings}`, `Example written: ${value.exampleWritten}`];
  for (const r of value.results) { lines.push(`${r.tool} ${r.kind}: ${r.status}`); for (const f of r.findings) lines.push(`  ${f.level} ${f.code} ${f.path || '/'}: ${f.message}`); }
  return lines.join('\n') + '\n';
}
