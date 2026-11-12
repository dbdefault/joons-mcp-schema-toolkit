// CLI grammar is deliberately independent of the other workers.
export function parseArgs(argv) {
  if (!Array.isArray(argv) || argv.some(x => typeof x !== 'string')) throw new Error('usage_error');
  if (argv.length === 1 && (argv[0] === '--help' || argv[0] === '--version')) return { command: argv[0].slice(2) };
  const command = argv[0];
  const specs = {
    validate: { snapshot: 1, format: 1, strict: 0 },
    lint: { snapshot: 1, format: 1, strict: 0 },
    check: { snapshot: 1, tool: 1, arguments: 1, format: 1, strict: 0 },
    example: { snapshot: 1, tool: 1, out: 1, force: 0, format: 1, strict: 0 },
    subset: { format: 1 }
  };
  if (!Object.hasOwn(specs, command)) throw new Error('usage_error');
  const result = { command, format: 'terminal' }, seen = new Set();
  for (let i = 1; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--') || token === '--') throw new Error('usage_error');
    const eq = token.indexOf('=');
    const key = token.slice(2, eq < 0 ? undefined : eq);
    if (!Object.hasOwn(specs[command], key) || seen.has(key)) throw new Error('usage_error');
    seen.add(key);
    if (specs[command][key] === 0) {
      if (eq >= 0) throw new Error('usage_error');
      result[key] = true;
    } else {
      const value = eq >= 0 ? token.slice(eq + 1) : argv[++i];
      if (!value || (eq < 0 && value.startsWith('--'))) throw new Error('usage_error');
      result[key] = value;
    }
  }
  const required = { validate: ['snapshot'], lint: ['snapshot'], check: ['snapshot','tool','arguments'], example: ['snapshot','tool','out'], subset: [] };
  for (const key of required[command]) if (!seen.has(key)) throw new Error('usage_error');
  if (!['terminal','json','markdown'].includes(result.format)) throw new Error('usage_error');
  return result;
}
