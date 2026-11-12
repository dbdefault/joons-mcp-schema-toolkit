import { isDeepStrictEqual, types as utilTypes } from 'node:util';
import { getSubset } from './subset.js';
import { ToolkitError } from '../errors.js';
export const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export const plain = o => o !== null && typeof o === 'object' && !Array.isArray(o) && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
const keywords = new Set([...getSubset().supported, ...getSubset().annotations]);
const types = new Set(['object','array','null','string','boolean','number','integer']);
export function guardJson(root) {
  const stack=[[root,0,false]], active=new WeakSet(); let count=0;
  while(stack.length) {
    const [v,d,exit]=stack.pop();
    if(exit){active.delete(v);continue;}
    if(++count>500000 || d>64) throw new ToolkitError('limit_exceeded');
    if(v===null || typeof v==='boolean') continue;
    if(typeof v==='number') {if(!Number.isFinite(v)) throw new ToolkitError('invalid_json'); continue;}
    if(typeof v==='string') {if(v.length>100000) throw new ToolkitError('limit_exceeded'); if(/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(v)) throw new ToolkitError('invalid_json'); continue;}
    if(typeof v!=='object' || utilTypes.isProxy(v) || (!Array.isArray(v)&&!plain(v))) throw new ToolkitError('invalid_json');
    if(active.has(v)) throw new ToolkitError('invalid_json');
    if(Array.isArray(v)&&v.length>100000) throw new ToolkitError('limit_exceeded');
    const keys=Reflect.ownKeys(v); if(count+keys.length>500001) throw new ToolkitError('limit_exceeded');
    if(keys.length===0) continue;
    active.add(v); stack.push([v,d,true]);
    for(let i=keys.length-1;i>=0;i--) {const k=keys[i]; if(Array.isArray(v)&&k==='length')continue; if(typeof k!=='string')throw new ToolkitError('invalid_json'); if(Array.isArray(v)&&(!/^(0|[1-9][0-9]*)$/.test(k)||Number(k)>=v.length))throw new ToolkitError('invalid_json'); if(k.length>100000) throw new ToolkitError('limit_exceeded'); if(/(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/.test(k)||['__proto__','constructor','prototype'].includes(k)) throw new ToolkitError('invalid_json'); const desc=Object.getOwnPropertyDescriptor(v,k); if(!desc || !desc.enumerable || !('value' in desc)) throw new ToolkitError('invalid_json'); stack.push([desc.value,d+1,false]);}
    if(Array.isArray(v)&&keys.length!==v.length+1) throw new ToolkitError('invalid_json');
  }
}
// guardJson has already restricted values to finite, acyclic JSON-like data.
// Length-delimited JSON strings and explicit tags make the encoding unambiguous.
export const structuralKey = (v, prototypes) => {
  if (v === null) return 'n';
  if (typeof v === 'number') return Object.is(v,-0) ? 'd-0' : 'd'+JSON.stringify(v);
  if (typeof v !== 'object') return typeof v === 'string' ? 's'+JSON.stringify(v) : 'b'+v;
  const proto=Object.getPrototypeOf(v);
  if (!prototypes.has(proto)) prototypes.set(proto,prototypes.size);
  const keys=Object.keys(v).sort();
  return (Array.isArray(v)?'a'+v.length:'o')+'p'+prototypes.get(proto)+'{'+keys.map(k=>JSON.stringify(k)+':'+structuralKey(v[k],prototypes)).join(',')+'}';
};
export function analyzeSchema(schema, kind) {
  guardJson(schema);
  const findings = [], stack = [[schema, '', 0]]; let invalid = false, incomplete = false;
  const add = (code, path, unsupported = false) => { if (findings.length >= 10000) throw new ToolkitError('limit_exceeded'); findings.push({code,level:'error',path}); if (unsupported) incomplete = true; else invalid = true; };
  while (stack.length) {
    const [s,p,depth] = stack.pop();
    if (!plain(s) || depth > 64) { add('SCHEMA_NOT_OBJECT',p); continue; }
    for (const k of Object.keys(s)) {
      const v=s[k], q=p+'/'+k;
      if (!keywords.has(k)) { add('UNSUPPORTED_KEYWORD',p,true); continue; }
      if (k==='type' && !(typeof v==='string' ? types.has(v) : Array.isArray(v) && v.length && v.every(x=>types.has(x)) && new Set(v).size===v.length)) add('TYPE_INVALID',q);
      if (k==='enum') { if (!Array.isArray(v) || !v.length) add('ENUM_INVALID',q); else { const seen=new Map(), prototypes=new Map(); let bad=false; for(const x of v) { const key=structuralKey(x,prototypes); if(seen.has(key) && isDeepStrictEqual(x,seen.get(key))) {bad=true; break;} seen.set(key,x); } if(bad) add('ENUM_INVALID',q); } }
      if (k==='required' && !(Array.isArray(v) && v.every(x=>typeof x==='string') && new Set(v).size===v.length)) add('REQUIRED_INVALID',q);
      if (k==='properties') { if (!plain(v)) add('PROPERTIES_INVALID',q); else { const keys=Object.keys(v).sort(); let bad=false; for(let i=keys.length-1;i>=0;i--) {if(!plain(v[keys[i]])) bad=true; else stack.push([v[keys[i]],q+'/<property-'+(i+1)+'>',depth+1]);} if(bad)add('PROPERTIES_INVALID',q); } }
      if (k==='items' || k==='additionalProperties') { if (plain(v)) stack.push([v,q,depth+1]); else if (!(k==='additionalProperties' && typeof v==='boolean')) add(k==='items'?'ITEMS_INVALID':'ADDITIONAL_PROPERTIES_INVALID',q); }
      if (['minLength','maxLength','minItems','maxItems'].includes(k) && !(Number.isSafeInteger(v)&&v>=0)) add('LENGTH_INVALID',q);
      if (['minimum','maximum','exclusiveMinimum','exclusiveMaximum'].includes(k) && !(typeof v==='number'&&Number.isFinite(v))) add('BOUND_INVALID',q);
    }
    for(const [lo,hi] of [['minLength','maxLength'],['minItems','maxItems']]) if(Number.isSafeInteger(s[lo])&&s[lo]>=0&&Number.isSafeInteger(s[hi])&&s[hi]>=0&&s[lo]>s[hi]) add('BOUNDS_CONTRADICT',p);
    for(const lo of ['minimum','exclusiveMinimum']) for(const hi of ['maximum','exclusiveMaximum']) if(Number.isFinite(s[lo])&&Number.isFinite(s[hi])&&(s[lo]>s[hi]||(s[lo]===s[hi]&&(lo==='exclusiveMinimum'||hi==='exclusiveMaximum')))) add('BOUNDS_CONTRADICT',p);
  }
  return {status:invalid?'invalid':incomplete?'incomplete':'valid',findings};
}
