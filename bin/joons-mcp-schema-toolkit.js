#!/usr/bin/env node
import { main } from '../src/cli.js';
// Ignore delayed stream errors after a failed write; main reports stdout failure.
process.stdout.on('error', () => {});
process.stderr.on('error', () => {});
process.exitCode = await main(process.argv.slice(2));
