import { isDeepStrictEqual } from 'node:util';
import { analyzeSchema,guardJson,own,plain,structuralKey } from './schema.js';
const match=(t,v)=>t==='null'?v===null:t==='array'?Array.isArray(v):t==='object'?plain(v):t==='integer'?typeof v==='number'&&Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):typeof v===t;
export function checkInstance(schema,instance) {
 const analysis=analyzeSchema(schema,'input'); if(analysis.status!=='valid')return analysis;
 guardJson(instance);
 const findings=[], stack=[[schema,instance,'',0]], enumIndexes=new WeakMap(), prototypes=new Map();
 const add=(code,path)=>{if(findings.length<10)findings.push({code,level:'error',path});};
 while(stack.length&&findings.length<10){const [s,v,p,d]=stack.pop(); if(d>64){add('DEPTH_EXCEEDED',p);continue;}
  if(own(s,'type')){const ts=Array.isArray(s.type)?s.type:[s.type]; if(!ts.some(t=>match(t,v))){add('TYPE_MISMATCH',p);continue;}}
  if(own(s,'enum')){let index=enumIndexes.get(s);if(!index){index=new Map();for(const x of s.enum)index.set(structuralKey(x,prototypes),x);enumIndexes.set(s,index);}const key=structuralKey(v,prototypes);if(!index.has(key)||!isDeepStrictEqual(index.get(key),v))add('ENUM_MISMATCH',p);}
  if(own(s,'const')&&!isDeepStrictEqual(s.const,v))add('CONST_MISMATCH',p);
  if(typeof v==='string'){let n=0; for(const ch of v)n++; if(own(s,'minLength')&&n<s.minLength)add('MIN_LENGTH',p);if(own(s,'maxLength')&&n>s.maxLength)add('MAX_LENGTH',p);}
  if(typeof v==='number'){for(const [k,c,fail] of [['minimum','MINIMUM',x=>v<x],['maximum','MAXIMUM',x=>v>x],['exclusiveMinimum','EXCLUSIVE_MINIMUM',x=>v<=x],['exclusiveMaximum','EXCLUSIVE_MAXIMUM',x=>v>=x]])if(own(s,k)&&fail(s[k]))add(c,p);}
  if(Array.isArray(v)){if(own(s,'minItems')&&v.length<s.minItems)add('MIN_ITEMS',p);if(own(s,'maxItems')&&v.length>s.maxItems)add('MAX_ITEMS',p); if(plain(s.items))for(let i=v.length-1;i>=0;i--)stack.push([s.items,v[i],p+'/<item-'+i+'>',d+1]);}
  if(plain(v)){if(Array.isArray(s.required))for(const k of s.required)if(!own(v,k))add('REQUIRED_MISSING',p); const keys=Object.keys(v).sort(), positions=new Map(); for(let i=0;i<keys.length;i++)positions.set(keys[i],i+1); const props=plain(s.properties)?s.properties:null;
   for(let i=keys.length-1;i>=0;i--){const k=keys[i], child=p+'/<property-'+positions.get(k)+'>'; if(props&&own(props,k))stack.push([props[k],v[k],child,d+1]);else if(s.additionalProperties===false)add('ADDITIONAL_PROPERTY',child);else if(plain(s.additionalProperties))stack.push([s.additionalProperties,v[k],child,d+1]);}}
 }
 return {status:findings.length?'invalid':'valid',findings};
}
