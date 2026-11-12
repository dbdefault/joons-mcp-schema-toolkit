import { analyzeSchema,own,plain } from './schema.js';
import { checkInstance } from './check.js';
import { unsafeIdentifier } from '../security/redact.js';
const order=['object','array','string','integer','number','boolean','null'];
export function makeExample(schema) {
 const analysis=analyzeSchema(schema,'input'); if(analysis.status!=='valid')return analysis;
 let count=0, failed=false, result; const stack=[{s:schema,depth:0,root:true,put:v=>{result=v;}}];
 while(stack.length&&!failed){const {s,depth,root,put}=stack.pop(); if(depth>32||++count>4096){failed=true;break;}
  const types=own(s,'type')?(Array.isArray(s.type)?s.type:[s.type]):[root?'object':'string']; const type=order.find(x=>types.includes(x));
  if(root&&type!=='object'){failed=true;break;}
  if(type==='object'){const keys=(s.required||[]).slice().sort(); if(keys.length>128){failed=true;break;} const value={};put(value);
   for(let i=keys.length-1;i>=0;i--){const k=keys[i]; if(unsafeIdentifier(k)){failed=true;break;} const child=plain(s.properties)&&own(s.properties,k)?s.properties[k]:{}; stack.push({s:child,depth:depth+1,root:false,put:v=>{Object.defineProperty(value,k,{value:v,enumerable:true,writable:true,configurable:true});}});}}
  else if(type==='array'){const n=s.minItems||0;if(n>64){failed=true;break;} const a=new Array(n);put(a);for(let i=n-1;i>=0;i--)stack.push({s:plain(s.items)?s.items:{},depth:depth+1,root:false,put:v=>{a[i]=v;}});}
  else if(type==='string'){const n=s.minLength||0;if(n>4096){failed=true;break;}put('x'.repeat(n));}
  else if(type==='integer'||type==='number')put(0);else if(type==='boolean')put(false);else put(null);
 }
 if(failed||checkInstance(schema,result).status!=='valid')return {status:'unavailable',findings:[]};
 return {status:'valid',findings:[],example:result};
}
