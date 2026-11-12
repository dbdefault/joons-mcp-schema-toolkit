// Origin: JOONS MCP Mock Server 0.1.0, Apache-2.0; see tests/vendor/README.md.
export const isPlainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
export const hasOwn = (object, key) => Object.hasOwn(object, key);
export const safePathSegment = (key, index) => /^[A-Za-z0-9_$.-]{1,64}$/.test(key) ? key : `<unknown key #${index}>`;

export function stripControls(text, { keepNewlines = false } = {}) {
  return text
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[\x20-\x3f]*[\x40-\x7e]/g, '')
    .replace(/[\x00-\x1f\x7f-\x9f\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,
      char => keepNewlines && (char === '\n' || char === '\t') ? char : '');
}
