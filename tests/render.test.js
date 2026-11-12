import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeReport} from '../src/output/report.js';
import {getSubset} from '../src/core/subset.js';
import {renderJson} from '../src/render/json.js';
import {renderTerminal} from '../src/render/terminal.js';
import {renderMarkdown} from '../src/render/markdown.js';

test('golden terminal and markdown reports for all commands', () => {
  for (const command of ['validate','lint','check','example']) {
    const r=makeReport(command,[{name:'private',kind:'input',status:'valid',findings:[]}]);
    assert.equal(renderTerminal(r),`Format: joons-mcp-schema-toolkit/report; schema version: 1\nTool: joons-mcp-schema-toolkit 0.1.0\n${command}: valid\nTools: 1; schemas: 1; invalid: 0; incomplete: 0; findings: 0\nExample written: false\ntool-1 input: valid\n`);
    assert.equal(renderMarkdown(r),`# ${command}: valid\n\nFormat: joons\\-mcp\\-schema\\-toolkit/report; schema version: 1\nTool: joons\\-mcp\\-schema\\-toolkit 0\\.1\\.0\n\nTools: 1; schemas: 1; invalid: 0; incomplete: 0; findings: 0\n\nExample written: false\n\n## tool\\-1 input: valid\n`);
    assert.equal(JSON.parse(renderJson(r)).command,command);
  }
});
test('hostile names and untrusted messages never enter any report', () => {
  const hostile='<script>PLANTED_MARKER</script>\u001b[31m\u202e'+'x'.repeat(10000);
  const report=makeReport('lint',[{name:hostile,kind:'input',status:'valid',findings:[{code:'EMPTY_SCHEMA',path:'',message:hostile}]}]);
  for (const render of [renderJson,renderTerminal,renderMarkdown]) { const s=render(report); assert.ok(!s.includes('PLANTED_MARKER')); assert.ok(!s.includes('\u001b')); assert.ok(!s.includes('\u202e')); assert.ok(s.endsWith('\n')); assert.ok(!s.includes('\r')); }
});
test('subset renders counts and markdown escapes', () => {
  const subset=getSubset();
  assert.match(renderTerminal(subset),/Supported \(15\):/);
  assert.match(renderMarkdown(subset),/unsupported \(13\):/);
  assert.equal(JSON.parse(renderJson(subset)).unknownKeywordPolicy,'incomplete');
});
