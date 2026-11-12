import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateArguments } from './vendor/mock/src/schema/arguments.js';
import { validateFixtures } from './vendor/mock/src/input/fixtures.js';

const dir = mkdtempSync(join(tmpdir(), 'joons-schema-e2e-'));
after(() => rmSync(dir, { recursive: true, force: true }));
const cli = resolve('bin/joons-mcp-schema-toolkit.js');
const snapshot = JSON.parse(readFileSync('tests/fixtures/snapshot.json', 'utf8'));
const save = (name, value) => { const path = join(dir, name); writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value)); return path; };
const input = save('snapshot.json', snapshot);
const args = save('arguments.json', { name: 'Ada' });
const run = (...argv) => spawnSync(process.execPath, [cli, ...argv], { encoding: 'utf8', windowsHide: true });
const json = r => JSON.parse(r.stdout);

test('help, version, usage and input errors', () => {
  assert.equal(run('--help').status, 0);
  assert.equal(run('--version').status, 0);
  assert.equal(run('validate', '--snapshot', input, '--snapshot', input).status, 3);
  const bad = run('validate', '--snapshot', 'tests/fixtures/duplicate.json');
  assert.equal(bad.status, 2); assert.equal(bad.stdout, '');
  assert.match(bad.stderr, /^joons-mcp-schema-toolkit: invalid_json\r?\n$/);
});
test('validate and check return deterministic anonymous reports', () => {
  const argv = ['validate', '--snapshot', input, '--format', 'json'];
  const first = run(...argv), second = run(...argv);
  assert.equal(first.status, 0); assert.equal(first.stdout, second.stdout);
  const report = json(first);
  assert.deepEqual(Object.keys(report), ['format','schemaVersion','tool','command','status','summary','results','exampleWritten']);
  assert.equal(report.status, 'valid'); assert.equal(report.results[0].tool, 'tool-1');
  assert.ok(!first.stdout.includes('greet'));
  assert.equal(run('check', '--snapshot', input, '--tool', 'greet', '--arguments', args).status, 0);
  const rejected = save('bad-arguments.json', { name: 5 });
  const result = run('check', '--snapshot', input, '--tool', 'greet', '--arguments', rejected, '--format', 'json');
  assert.equal(result.status, 2); assert.equal(json(result).status, 'invalid');
});
test('all formats, lint, subset and unsupported keyword', () => {
  for (const format of ['terminal','json','markdown']) {
    assert.equal(run('subset', '--format', format).status, 0);
    assert.equal(run('validate', '--snapshot', input, '--format', format).status, 0);
    assert.equal(run('lint', '--snapshot', input, '--format', format).status, 0);
  }
  const altered = structuredClone(snapshot); altered.tools[0].inputSchema.pattern = 'not executed';
  const file = save('unsupported.json', altered);
  const result = run('validate', '--snapshot', file, '--strict', '--format', 'json');
  assert.equal(result.status, 2); assert.equal(json(result).status, 'incomplete');
});
test('example and fixture pass vendored validators', () => {
  const out = join(dir, 'output');
  const result = run('example', '--snapshot', input, '--tool', 'greet', '--out', out, '--format', 'json');
  assert.equal(result.status, 0); assert.equal(json(result).exampleWritten, true);
  const generated = JSON.parse(readFileSync(join(out, 'example.json'), 'utf8'));
  const fixture = JSON.parse(readFileSync(join(out, 'fixtures.json'), 'utf8'));
  assert.equal(validateArguments(snapshot.tools[0].inputSchema, generated).ok, true);
  assert.equal(validateFixtures(fixture, { snapshot }).ok, true);
  assert.equal(readFileSync(join(out, '.joons-schema-toolkit-output')).length, 0);
  assert.deepEqual(fixture.tools.greet.match[0].arguments, generated);
});
test('unavailable example does not create output', () => {
  const s = structuredClone(snapshot); s.tools[0].inputSchema.properties.name.const = 'not-generated';
  const file = save('unavailable.json', s); const out = join(dir, 'unavailable-output');
  const result = run('example', '--snapshot', file, '--tool', 'greet', '--out', out, '--strict', '--format', 'json');
  assert.equal(result.status, 2); assert.equal(json(result).status, 'unavailable');
});
