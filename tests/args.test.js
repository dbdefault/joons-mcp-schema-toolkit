import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/args.js';
const valid = [['validate','--snapshot','x'],['lint','--snapshot=x'],['check','--snapshot','x','--tool','t','--arguments','a'],['example','--snapshot','x','--tool','t','--out','o','--force'],['subset'],['--help'],['--version']];
for (const argv of valid) test(`accept ${argv.join(' ')}`, () => assert.ok(parseArgs(argv)));
for (const format of ['terminal','json','markdown']) for (const cmd of valid.slice(0,5)) test(`${cmd[0]} ${format}`, () => assert.equal(parseArgs([...cmd,'--format',format]).format,format));
const bad = [[],['--help','--version'],['wat'],['subset','--'],['subset','x'],['subset','--strict'],['subset','--format'],['subset','--format='],['subset','--format=y'],['subset','--format=json','--format=json'],['validate'],['validate','--snapshot','--strict'],['validate','--snapshot='],['validate','--snapshot=x','--force'],['validate','--snapshot=x','--strict=true'],['check','--snapshot=x','--tool=t'],['example','--snapshot=x','--tool=t'],['subset','--unknown']];
for (const argv of bad) test(`reject ${argv.join(' ')}`, () => assert.throws(() => parseArgs(argv)));
