import { parseArgs } from './args.js';
import { VERSION } from './version.js';
import { readInput } from './input/read.js';
import { analyzeSchema } from './core/schema.js';
import { lintSchema } from './core/lint.js';
import { checkInstance } from './core/check.js';
import { makeExample } from './core/example.js';
import { getSubset } from './core/subset.js';
import { makeReport } from './output/report.js';
import { makeFixtures } from './output/fixtures.js';
import { prepareOutputDir, writeAtomic } from './security/safe-dir.js';
import { unsafeIdentifier } from './security/redact.js';
import { renderJson } from './render/json.js';
import { renderTerminal } from './render/terminal.js';
import { renderMarkdown } from './render/markdown.js';

const help = `Usage:
  joons-mcp-schema-toolkit validate --snapshot FILE [--format terminal|json|markdown] [--strict]
  joons-mcp-schema-toolkit lint --snapshot FILE [--format terminal|json|markdown] [--strict]
  joons-mcp-schema-toolkit check --snapshot FILE --tool NAME --arguments FILE [--format terminal|json|markdown] [--strict]
  joons-mcp-schema-toolkit example --snapshot FILE --tool NAME --out DIR [--force] [--format terminal|json|markdown] [--strict]
  joons-mcp-schema-toolkit subset [--format terminal|json|markdown]
  joons-mcp-schema-toolkit --help | --version
`;
const errors = new Set(['input_unreadable','invalid_json','invalid_snapshot','limit_exceeded','tool_not_found','schema_invalid','unsupported_keyword','instance_invalid','lint_findings','example_unavailable','output_error','usage_error']);
async function write(stream, text) {
  // Resolve only after the write callback, including asynchronous EPIPE.
  await new Promise((resolve, reject) => {
    let settled = false;
    const finish = error => { if (settled) return; settled = true; stream.removeListener?.('error', onError); error ? reject(error) : resolve(); };
    const onError = error => finish(error);
    stream.once?.('error', onError);
    try { stream.write(text, finish); } catch (error) { finish(error); }
  });
}
async function diagnostic(io, kind) { try { await write(io.stderr, `joons-mcp-schema-toolkit: ${kind}\n`); } catch {} }
export async function main(argv, io = { stdout: process.stdout, stderr: process.stderr }) {
  let args;
  try { args = parseArgs(argv); } catch { await diagnostic(io, 'usage_error'); return 3; }
  let data, rejection;
  try {
    if (args.command === 'help' || args.command === 'version') data = args.command === 'help' ? help : `${VERSION}\n`;
    else if (args.command === 'subset') data = await getSubset();
    else {
      const snapshot = await readInput(args.snapshot, 'snapshot');
      const tools = snapshot.tools.slice().sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
      let selected = tools;
      if (args.tool !== undefined) {
        const found = tools.find(t => t.name === args.tool);
        if (!found) throw { kind: 'tool_not_found' };
        selected = [found];
      }
      const results = [];
      results.toolNames = tools.map(t => t.name);
      const instance = args.command === 'check' ? await readInput(args.arguments, 'arguments') : undefined;
      for (const tool of selected) {
        const schemas = [['input', tool.inputSchema]];
        if ((args.command === 'validate' || args.command === 'lint') && tool.outputSchema !== null) schemas.push(['output', tool.outputSchema]);
        for (const [kind, schema] of schemas) {
          let analysis = await analyzeSchema(schema, kind);
          if (args.command === 'lint') analysis = await lintSchema(schema, kind);
          if (analysis.status === 'valid' && args.command === 'check') analysis = await checkInstance(schema, instance);
          if (analysis.status === 'valid' && args.command === 'example') {
            const example = await makeExample(schema);
            if (example.status === 'unavailable' || unsafeIdentifier(tool.name)) analysis = {status:'unavailable', findings:[]};
            else {
              const dir = await prepareOutputDir(args.out, [args.snapshot], !!args.force);
              await writeAtomic(dir, 'example.json', JSON.stringify(example.example, null, 2) + '\n');
              await writeAtomic(dir, 'fixtures.json', JSON.stringify(await makeFixtures(tool.name, example.example), null, 2) + '\n');
              await writeAtomic(dir, '.joons-schema-toolkit-output', '');
              results.exampleWritten = true;
            }
          }
          results.push({ name: tool.name, kind, ...analysis });
        }
      }
      data = await makeReport(args.command, results);
      if (data.status !== 'valid') rejection = data.status === 'incomplete' ? 'unsupported_keyword' : data.status === 'unavailable' ? 'example_unavailable' : args.command === 'check' ? 'instance_invalid' : args.command === 'lint' ? 'lint_findings' : 'schema_invalid';
    }
    if (typeof data !== 'string') data = await ({ json: renderJson, terminal: renderTerminal, markdown: renderMarkdown })[args.format](data);
  } catch (error) {
    const kind = errors.has(error?.kind) ? error.kind : 'input_unreadable';
    await diagnostic(io, kind);
    return kind === 'output_error' ? 4 : 2;
  }
  try { await write(io.stdout, data); } catch { await diagnostic(io, 'output_error'); return 4; }
  if (rejection) { await diagnostic(io, rejection); return 2; }
  return 0;
}
