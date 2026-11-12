// Origin: JOONS MCP Mock Server 0.1.0, Apache-2.0; see tests/vendor/README.md.
import { isDeepStrictEqual } from 'node:util';
import { isPlainObject, hasOwn, safePathSegment } from '../util/object.js';

export function validateArguments(schema, args) {
  const errors = [], stack = [[schema, args === undefined ? {} : args, '', 0]];
  const add = (path, message) => { if (errors.length < 10) errors.push({ path, message }); };
  const types = new Map([['object', isPlainObject], ['array', Array.isArray], ['null', v => v === null], ['string', v => typeof v === 'string'], ['boolean', v => typeof v === 'boolean'], ['number', v => typeof v === 'number' && Number.isFinite(v)], ['integer', v => typeof v === 'number' && Number.isInteger(v)]]);
  while (stack.length && errors.length < 10) {
    const [s, v, path, depth] = stack.pop();
    if (depth > 64) { add(path, 'maximum validation depth exceeded'); continue; }
    if (!isPlainObject(s)) continue;
    if (hasOwn(s, 'type')) {
      const wanted = Array.isArray(s.type) ? s.type : [s.type];
      if (!wanted.some(t => types.has(t) && types.get(t)(v))) { add(path, 'type mismatch'); continue; }
    }
    if (Array.isArray(s.enum) && !s.enum.some(x => isDeepStrictEqual(x, v))) add(path, 'not in enum');
    if (hasOwn(s, 'const') && !isDeepStrictEqual(s.const, v)) add(path, 'does not match const');
    if (typeof v === 'string') {
      const n = [...v].length;
      if (typeof s.minLength === 'number' && n < s.minLength) add(path, 'shorter than minLength');
      if (typeof s.maxLength === 'number' && n > s.maxLength) add(path, 'longer than maxLength');
    }
    if (typeof v === 'number') for (const [key, invalid] of [['minimum', x => v < x], ['maximum', x => v > x], ['exclusiveMinimum', x => v <= x], ['exclusiveMaximum', x => v >= x]]) if (typeof s[key] === 'number' && invalid(s[key])) add(path, `violates ${key}`);
    if (Array.isArray(v)) {
      if (typeof s.minItems === 'number' && v.length < s.minItems) add(path, 'fewer than minItems');
      if (typeof s.maxItems === 'number' && v.length > s.maxItems) add(path, 'more than maxItems');
      if (isPlainObject(s.items)) for (let i = v.length - 1; i >= 0; i--) stack.push([s.items, v[i], path + '/' + i, depth + 1]);
    }
    if (isPlainObject(v)) {
      if (Array.isArray(s.required)) for (const key of s.required) if (typeof key === 'string' && !hasOwn(v, key)) add(path, 'required property missing');
      const keys = Object.keys(v), props = isPlainObject(s.properties) ? s.properties : null;
      for (let i = keys.length - 1; i >= 0; i--) {
        const key = keys[i], child = path + '/' + safePathSegment(key, i + 1);
        if (props && hasOwn(props, key)) stack.push([props[key], v[key], child, depth + 1]);
        else if (s.additionalProperties === false) add(child, 'additional property not allowed');
        else if (isPlainObject(s.additionalProperties)) stack.push([s.additionalProperties, v[key], child, depth + 1]);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
