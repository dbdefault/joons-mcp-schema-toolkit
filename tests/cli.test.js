import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { main } from '../src/cli.js';
function capture(fail = false) { let value = ''; const stream = new Writable({ write(chunk, enc, cb) { if (fail) cb(Object.assign(new Error('private'), {code:'EPIPE'})); else { value += chunk; cb(); } } }); stream.on('error', () => {}); return {stream, text: () => value}; }
test('usage goes only to stderr', async () => { const o=capture(), e=capture(); assert.equal(await main(['bad'],{stdout:o.stream,stderr:e.stream}),3); assert.equal(o.text(),''); assert.equal(e.text(),'joons-mcp-schema-toolkit: usage_error\n'); });
test('help and version', async () => { for (const arg of ['--help','--version']) { const o=capture(),e=capture(); assert.equal(await main([arg],{stdout:o.stream,stderr:e.stream}),0); assert.ok(o.text().endsWith('\n')); assert.equal(e.text(),''); } });
test('stdout failure yields 4 and fixed diagnostic', async () => { const o=capture(true),e=capture(); assert.equal(await main(['--help'],{stdout:o.stream,stderr:e.stream}),4); assert.equal(e.text(),'joons-mcp-schema-toolkit: output_error\n'); });
test('unreadable input is closed and does not leak errors', async () => { const o=capture(),e=capture(); assert.equal(await main(['validate','--snapshot','secret','--strict'],{stdout:o.stream,stderr:e.stream}),2); assert.equal(o.text(),''); assert.equal(e.text(),'joons-mcp-schema-toolkit: input_unreadable\n'); });
