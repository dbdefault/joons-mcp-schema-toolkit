// makeReport(command, results): results is an array of {name, kind, status,
// findings:[{code,path}]}. Attach results.toolNames (all snapshot names, for
// global ordinals) and results.exampleWritten (true only after marker write).
// For validate/lint toolNames includes all tools; for check/example it still
// includes all names, while results contains only the selected input schema.
// Findings may have other fields, but those fields never enter a report.
import { ToolkitError } from '../errors.js';
const definitions = {
  SCHEMA_NOT_OBJECT: ['error', 'Schema must be an object.'], TYPE_INVALID: ['error', 'Invalid type keyword.'], ENUM_INVALID: ['error', 'Invalid enum keyword.'], REQUIRED_INVALID: ['error', 'Invalid required keyword.'], PROPERTIES_INVALID: ['error', 'Invalid properties keyword.'], ADDITIONAL_PROPERTIES_INVALID: ['error', 'Invalid additionalProperties keyword.'], ITEMS_INVALID: ['error', 'Invalid items keyword.'], LENGTH_INVALID: ['error', 'Invalid length or item limit.'], BOUND_INVALID: ['error', 'Invalid numeric bound.'], BOUNDS_CONTRADICT: ['error', 'Bounds contradict.'], UNSUPPORTED_KEYWORD: ['warn', 'Unsupported keyword.'],
  EMPTY_SCHEMA: ['warn', 'Empty schema.'], TYPE_MISSING: ['warn', 'Type is missing.'], ADDITIONAL_PROPERTIES_UNDECIDED: ['warn', 'Additional properties are undecided.'], PROPERTY_DESCRIPTION_MISSING: ['info', 'Property description is missing.'], NON_OBJECT_INPUT_SCHEMA: ['warn', 'Input schema does not include object.'], UNKNOWN_KEYWORD: ['warn', 'Unknown keyword.'],
  TYPE_MISMATCH: ['error', 'Type mismatch.'], ENUM_MISMATCH: ['error', 'Enum mismatch.'], CONST_MISMATCH: ['error', 'Const mismatch.'], MIN_LENGTH: ['error', 'Minimum length not met.'], MAX_LENGTH: ['error', 'Maximum length exceeded.'], MINIMUM: ['error', 'Minimum not met.'], MAXIMUM: ['error', 'Maximum exceeded.'], EXCLUSIVE_MINIMUM: ['error', 'Exclusive minimum not met.'], EXCLUSIVE_MAXIMUM: ['error', 'Exclusive maximum exceeded.'], MIN_ITEMS: ['error', 'Minimum item count not met.'], MAX_ITEMS: ['error', 'Maximum item count exceeded.'], REQUIRED_MISSING: ['error', 'Required property is missing.'], ADDITIONAL_PROPERTY: ['error', 'Additional property is not allowed.'], DEPTH_EXCEEDED: ['error', 'Maximum depth exceeded.']
};
const segments = new Set(['type','enum','const','required','properties','additionalProperties','items','minItems','maxItems','minLength','maxLength','minimum','maximum','exclusiveMinimum','exclusiveMaximum','$schema','$id','$ref','$defs','pattern','format','allOf','anyOf','oneOf','not','patternProperties','uniqueItems','multipleOf']);
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
function safePath(path) {
  if (typeof path !== 'string' || path.length > 8192 || (path && !path.startsWith('/'))) throw new TypeError('Invalid structural path');
  if (!path) return '';
  for (const segment of path.slice(1).split('/')) {
    if (!segments.has(segment) && !/^<property-[1-9][0-9]*>$/.test(segment) && !/^<item-(?:0|[1-9][0-9]*)>$/.test(segment)) throw new TypeError('Invalid structural path');
  }
  return path;
}
export function makeReport(command, results) {
  if (!['validate','lint','check','example'].includes(command) || !Array.isArray(results)) throw new TypeError('Invalid report input');
  const names = new Set(); let total = 0;
  for (const r of results) { if (typeof r.name !== 'string' || !['input','output'].includes(r.kind) || !['valid','invalid','incomplete', ...(command === 'example' ? ['unavailable'] : [])].includes(r.status) || !Array.isArray(r.findings)) throw new TypeError('Invalid result'); names.add(r.name); total += r.findings.length; if (total > 10000) throw new ToolkitError('limit_exceeded'); }
  const allNames = results.toolNames === undefined ? Array.from(names) : results.toolNames;
  if (!Array.isArray(allNames) || allNames.length > 10000 || allNames.some(n => typeof n !== 'string') || new Set(allNames).size !== allNames.length) throw new TypeError('Invalid tool names');
  const sortedNames = Array.from(allNames).sort(cmp); const ordinals = new Map(sortedNames.map((name, i) => [name, i + 1]));
  for (const name of names) if (!ordinals.has(name)) throw new TypeError('Missing tool name');
  if ((command === 'check' || command === 'example') && (results.length !== 1 || results[0].kind !== 'input')) throw new TypeError('Invalid selection');
  const seen = new Set(); for (const r of results) { const key = `${ordinals.get(r.name)}:${r.kind}`; if (seen.has(key)) throw new TypeError('Duplicate result'); seen.add(key); }
  const items = results.map(r => {
    const findings = r.findings.map(f => { const d = Object.hasOwn(definitions, f.code) && definitions[f.code]; if (!d) throw new TypeError('Invalid finding code'); return {code: f.code, level: d[0], path: safePath(f.path), message: d[1]}; });
    findings.sort((a,b) => cmp(a.path,b.path) || cmp(a.code,b.code));
    const unique = findings.filter((f,i) => !i || f.path !== findings[i-1].path || f.code !== findings[i-1].code);
    return { ordinal: ordinals.get(r.name), tool: `tool-${ordinals.get(r.name)}`, kind: r.kind, status: r.status, findings: unique };
  });
  items.sort((a,b) => a.ordinal-b.ordinal || cmp(a.kind,b.kind));
  const out = items.map(({tool,kind,status,findings}) => ({tool,kind,status,findings}));
  const invalid = out.filter(r => r.status === 'invalid').length, incomplete = out.filter(r => r.status === 'incomplete').length;
  const findings = out.reduce((n,r) => n+r.findings.length, 0);
  const status = invalid || (command === 'lint' && findings) ? 'invalid' : incomplete ? 'incomplete' : out.some(r => r.status === 'unavailable') ? 'unavailable' : 'valid';
  const tools = command === 'validate' || command === 'lint' ? allNames.length : names.size;
  if (!Number.isSafeInteger(tools) || tools < names.size || (results.exampleWritten === true && (command !== 'example' || status !== 'valid'))) throw new TypeError('Invalid report metadata');
  return {format:'joons-mcp-schema-toolkit/report', schemaVersion:1, tool:{name:'joons-mcp-schema-toolkit',version:'0.1.0'}, command, status, summary:{tools,schemas:out.length,invalid,incomplete,findings}, results:out, exampleWritten:results.exampleWritten === true};
}

// Re-project renderer input through fixed vocabulary; never trust messages or
// extra properties on an otherwise report-shaped object.
export function safeRenderValue(value) {
  if (value?.format === 'joons-mcp-schema-toolkit/subset') {
    return {format:'joons-mcp-schema-toolkit/subset',schemaVersion:1,
      supported:['additionalProperties','const','enum','exclusiveMaximum','exclusiveMinimum','items','maxItems','maxLength','maximum','minItems','minLength','minimum','properties','required','type'],
      annotations:['default','description','examples','title'],
      unsupported:['$defs','$id','$ref','$schema','allOf','anyOf','format','multipleOf','not','oneOf','pattern','patternProperties','uniqueItems'],unknownKeywordPolicy:'incomplete'};
  }
  if (value?.format !== 'joons-mcp-schema-toolkit/report' || !Array.isArray(value.results) || !value.summary) throw new TypeError('Invalid report');
  const ordinalNames = new Map();
  const rows = value.results.map(r => {
    if (typeof r.tool !== 'string' || !/^tool-[1-9][0-9]*$/.test(r.tool)) throw new TypeError('Invalid ordinal');
    const ordinal = Number(r.tool.slice(5));
    if (!Number.isSafeInteger(ordinal) || ordinal > 10000) throw new TypeError('Invalid ordinal');
    const name = String(ordinal).padStart(5, '0'); ordinalNames.set(name, r.tool);
    return {name,kind:r.kind,status:r.status,findings:r.findings};
  });
  // Retain the already assigned global ordinals; no raw names are available.
  const original = Array.from(ordinalNames.keys()).sort(cmp); const report = makeReport(value.command, rows);
  for (const result of report.results) result.tool = ordinalNames.get(original[Number(result.tool.slice(5))-1]);
  const tools = value.summary.tools;
  if (!Number.isSafeInteger(tools) || tools < new Set(original).size || tools > 10000) throw new TypeError('Invalid tool count');
  report.summary.tools = tools;
  if (value.exampleWritten === true) { if (report.command !== 'example' || report.status !== 'valid') throw new TypeError('Invalid artifact state'); report.exampleWritten = true; }
  return report;
}
