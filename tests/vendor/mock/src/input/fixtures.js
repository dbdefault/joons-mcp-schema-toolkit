// Origin: JOONS MCP Mock Server 0.1.0, Apache-2.0; see tests/vendor/README.md.
import { isPlainObject, hasOwn, safePathSegment } from '../util/object.js';

const reserved = new Set(['__proto__', 'constructor', 'prototype']);
const builtins = new Set(['default', 'empty', 'error', 'slow', 'server-error']);
const namePattern = /^[a-z][a-z0-9_-]{0,63}$/;
const base64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

export function validateFixtures(value, { snapshot } = {}) {
  const errors = [], warnings = [];
  const add = (path, message) => errors.push({ path, message });
  const keys = (obj, allowed, path) => {
    if (!isPlainObject(obj)) { add(path, 'expected object'); return false; }
    Object.keys(obj).forEach((key, i) => {
      const p = path + '/' + safePathSegment(key, i + 1);
      if (reserved.has(key)) add(p, 'reserved key');
      else if (allowed && !allowed.includes(key)) add(p, 'unknown key');
    });
    return true;
  };
  const rejectReserved = (root, path) => {
    const stack = [[root, path]];
    while (stack.length) {
      const [v, p] = stack.pop();
      if (!v || typeof v !== 'object') continue;
      Object.keys(v).forEach((key, i) => {
        const child = p + '/' + safePathSegment(key, i + 1);
        if (reserved.has(key)) add(child, 'reserved key');
        stack.push([v[key], child]);
      });
    }
  };
  const snapshotTools = new Map(Array.isArray(snapshot?.tools) ? snapshot.tools.map(t => [t.name, t]) : []);
  const response = (r, p, tool) => {
    if (!keys(r, ['content', 'structuredContent', 'isError', 'delayMs', 'protocolError'], p)) return;
    if (hasOwn(r, 'delayMs') && (!Number.isInteger(r.delayMs) || r.delayMs < 0 || r.delayMs > 30000)) add(p + '/delayMs', 'invalid delay');
    if (hasOwn(r, 'protocolError')) {
      for (const k of ['content', 'structuredContent', 'isError']) if (hasOwn(r, k)) add(p + '/' + k, 'not allowed with protocolError');
      const e = r.protocolError;
      if (keys(e, ['code', 'message'], p + '/protocolError')) {
        if (hasOwn(e, 'code') && (!Number.isInteger(e.code) || (e.code >= -32700 && e.code <= -32600 && e.code !== -32603))) add(p + '/protocolError/code', 'invalid protocol error code');
        if (typeof e.message !== 'string' || !e.message.length || e.message.length > 1000) add(p + '/protocolError/message', 'invalid message');
      }
    } else {
      if (!Array.isArray(r.content) || r.content.length > 100) add(p + '/content', 'expected content array of at most 100 blocks');
      else r.content.forEach((b, i) => {
        const bp = p + '/content/' + i;
        if (!isPlainObject(b)) { add(bp, 'expected block object'); return; }
        const allowed = b.type === 'text' ? ['type', 'text'] : ['type', 'data', 'mimeType'];
        for (const key of Object.keys(b)) if (!allowed.includes(key) && !reserved.has(key)) add(bp + '/' + safePathSegment(key, Object.keys(b).indexOf(key) + 1), 'unknown key');
        if (b.type === 'text') { if (typeof b.text !== 'string') add(bp + '/text', 'expected string'); }
        else if (b.type === 'image' || b.type === 'audio') {
          if (typeof b.data !== 'string' || !base64.test(b.data)) add(bp + '/data', 'invalid base64');
          if (typeof b.mimeType !== 'string') add(bp + '/mimeType', 'expected string');
        } else add(bp + '/type', 'invalid block type');
      });
      if (hasOwn(r, 'structuredContent') && !isPlainObject(r.structuredContent)) add(p + '/structuredContent', 'expected object');
      if (hasOwn(r, 'isError') && typeof r.isError !== 'boolean') add(p + '/isError', 'expected boolean');
      if (tool?.outputSchema && r.isError !== true && !hasOwn(r, 'structuredContent')) warnings.push({ path: p, message: 'standard MCP clients reject this result' });
    }
    try { if (Buffer.byteLength(JSON.stringify(r), 'utf8') > 4 * 1024 * 1024) add(p, 'response exceeds size limit'); } catch { add(p, 'response is not serializable'); }
  };
  if (keys(value, ['format', 'fixtureVersion', 'missingFixture', 'scenarios', 'tools'], '')) {
    if (value.format !== 'joons-mcp-mock-server/fixtures') add('/format', 'invalid format');
    if (value.fixtureVersion !== 1) add('/fixtureVersion', 'invalid fixture version');
    if (hasOwn(value, 'missingFixture') && !['error', 'empty'].includes(value.missingFixture)) add('/missingFixture', 'invalid missingFixture');
    const scenarios = hasOwn(value, 'scenarios') ? value.scenarios : {};
    if (keys(scenarios, null, '/scenarios')) {
      if (Object.keys(scenarios).length > 100) add('/scenarios', 'too many scenarios');
      Object.keys(scenarios).forEach((name, i) => {
        const p = '/scenarios/' + safePathSegment(name, i + 1);
        if (!namePattern.test(name) || builtins.has(name)) add(p, 'invalid scenario name');
        if (keys(scenarios[name], ['description'], p) && hasOwn(scenarios[name], 'description') && (typeof scenarios[name].description !== 'string' || scenarios[name].description.length > 1000)) add(p + '/description', 'invalid description');
      });
    }
    if (keys(value.tools, null, '/tools')) {
      if (Object.keys(value.tools).length > 10000) add('/tools', 'too many tools');
      Object.keys(value.tools).forEach((name, i) => {
        const p = '/tools/' + safePathSegment(name, i + 1), entry = value.tools[name], tool = snapshotTools.get(name);
        if (snapshot && !snapshotTools.has(name)) add(p, 'tool not in snapshot');
        if (!keys(entry, ['default', 'match', 'scenarios'], p)) return;
        if (!['default', 'match', 'scenarios'].some(k => hasOwn(entry, k))) add(p, 'empty tool entry');
        if (hasOwn(entry, 'default')) response(entry.default, p + '/default', tool);
        if (hasOwn(entry, 'match')) {
          if (!Array.isArray(entry.match) || entry.match.length > 100) add(p + '/match', 'invalid match array');
          else entry.match.forEach((m, j) => {
            const mp = p + '/match/' + j;
            if (!keys(m, ['arguments', 'response'], mp)) return;
            if (!isPlainObject(m.arguments)) add(mp + '/arguments', 'expected object'); else rejectReserved(m.arguments, mp + '/arguments');
            response(m.response, mp + '/response', tool);
          });
        }
        if (hasOwn(entry, 'scenarios') && keys(entry.scenarios, null, p + '/scenarios')) Object.keys(entry.scenarios).forEach((scenario, j) => {
          const sp = p + '/scenarios/' + safePathSegment(scenario, j + 1);
          if (!isPlainObject(scenarios) || !hasOwn(scenarios, scenario)) add(sp, 'scenario not declared');
          response(entry.scenarios[scenario], sp, tool);
        });
      });
    }
  }
  const sort = (a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
  errors.sort(sort); warnings.sort(sort);
  let fixtures;
  if (!errors.length) {
    fixtures = structuredClone(value);
    if (!hasOwn(fixtures, 'missingFixture')) fixtures.missingFixture = 'error';
    if (!hasOwn(fixtures, 'scenarios')) fixtures.scenarios = {};
    for (const name of Object.keys(fixtures.tools)) {
      const entry = fixtures.tools[name];
      const responses = [];
      if (hasOwn(entry, 'default')) responses.push(entry.default);
      if (Array.isArray(entry.match)) for (const match of entry.match) responses.push(match.response);
      if (isPlainObject(entry.scenarios)) for (const scenario of Object.keys(entry.scenarios)) responses.push(entry.scenarios[scenario]);
      for (const r of responses) if (hasOwn(r, 'protocolError') && !hasOwn(r.protocolError, 'code')) r.protocolError.code = -32603;
    }
    const stack = [fixtures];
    while (stack.length) { const v = stack.pop(); if (v && typeof v === 'object' && !Object.isFrozen(v)) { for (const k of Object.keys(v)) stack.push(v[k]); Object.freeze(v); } }
  }
  return { ok: errors.length === 0, errors, warnings, fixtures };
}
