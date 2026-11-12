import { ToolkitError } from '../errors.js';
import { types as utilTypes } from 'node:util';
export const LIMITS = Object.freeze({ bytes: 8 * 1024 * 1024, depth: 64, nodes: 500000, string: 100000, array: 100000, tools: 10000 });
const reserved = new Set(['__proto__', 'constructor', 'prototype']);
export function validString(s) {
  if (s.length > LIMITS.string) throw new ToolkitError('limit_exceeded');
  for (let i=0;i<s.length;i++) { const c=s.charCodeAt(i); if (c>=0xd800 && c<=0xdbff) { const n=s.charCodeAt(++i); if (!(n>=0xdc00 && n<=0xdfff)) throw new ToolkitError('invalid_json'); } else if (c>=0xdc00 && c<=0xdfff) throw new ToolkitError('invalid_json'); }
}
export function checkKey(k) { validString(k); if (reserved.has(k)) throw new ToolkitError('invalid_json'); }
export function isPlain(v) { if (v===null || typeof v!=='object' || Array.isArray(v)) return false; const p=Object.getPrototypeOf(v); return p===Object.prototype || p===null; }
export function validateValue(root) {
  const active=new Set(), stack=[{v:root,d:0}], leave=Symbol(); let nodes=0;
  while(stack.length) { const {v,d}=stack.pop(); if(d===leave){active.delete(v);continue;} if(d>LIMITS.depth || ++nodes>LIMITS.nodes) throw new ToolkitError('limit_exceeded');
    if(typeof v==='string'){validString(v);continue;} if(v===null || typeof v==='boolean') continue; if(typeof v==='number' && Number.isFinite(v)) continue;
    if(typeof v!=='object' || utilTypes.isProxy(v) || (!Array.isArray(v) && !isPlain(v)) || active.has(v)) throw new ToolkitError('invalid_json');
    const desc=Object.getOwnPropertyDescriptors(v); if(Object.getOwnPropertySymbols(v).length) throw new ToolkitError('invalid_json');
    if(Array.isArray(v) && v.length>LIMITS.array) throw new ToolkitError('limit_exceeded');
    active.add(v); stack.push({v,d:leave}); let count=0;
    for(const k of Object.keys(desc)){const x=desc[k]; if(Array.isArray(v) && k==='length') continue; if(!x.enumerable || !('value' in x)) throw new ToolkitError('invalid_json'); if(Array.isArray(v)){if(!/^(0|[1-9][0-9]*)$/.test(k) || Number(k)>=v.length) throw new ToolkitError('invalid_json'); count++;} else checkKey(k); stack.push({v:x.value,d:d+1});}
    if(Array.isArray(v) && count!==v.length) throw new ToolkitError('invalid_json');
  } return root;
}
