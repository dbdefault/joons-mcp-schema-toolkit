import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
const files = readdirSync('tests').filter(n => n.endsWith('.test.js')).sort().map(n => join('tests', n));
if (!files.length) throw new Error('No test files found');
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', windowsHide: true });
if (result.error) { console.error('Unable to start tests'); process.exitCode = 1; }
else process.exitCode = result.status ?? 1;
