import fs from 'node:fs';
import { ToolkitError } from '../errors.js';
import { LIMITS, validString, checkKey, isPlain } from '../security/limits.js';
import { validateParsedSnapshot } from './snapshot.js';

// Recursive descent is bounded before descending; values are allocated only after their limits are checked.
export function parseInput(text) {
 let i=0,nodes=0; const fail=()=>{throw new ToolkitError('invalid_json');}; const ws=()=>{while(i<text.length && (text[i]===' '||text[i]==='\n'||text[i]==='\r'||text[i]==='\t')) i++;};
 function str(){const start=i++;let count=0;while(i<text.length){const c=text.charCodeAt(i++);if(c<32)fail();if(c===34){let s;try{s=JSON.parse(text.slice(start,i));}catch{fail();}validString(s);return s;}if(c===92){if(i>=text.length)fail();const e=text[i++];if(e==='u'){if(!/^[0-9a-fA-F]{4}$/.test(text.slice(i,i+4)))fail();i+=4;}else if(!'"\\/bfnrt'.includes(e))fail();}if(++count>LIMITS.string)throw new ToolkitError('limit_exceeded');}fail();}
 function value(d){ws();if(d>LIMITS.depth || ++nodes>LIMITS.nodes) throw new ToolkitError('limit_exceeded'); const c=text[i];
  if(c==='"') return str();
  if(c==='{'){i++;const o=Object.create(null),keys=new Set();ws();if(text[i]==='}'){i++;return o;} for(;;){ws();if(text[i]!=='"')fail();const k=str();checkKey(k);if(keys.has(k))fail();keys.add(k);ws();if(text[i++]!==':')fail();o[k]=value(d+1);ws();const t=text[i++];if(t==='}')return o;if(t!==',')fail();}}
  if(c==='['){i++;const a=[];ws();if(text[i]===']'){i++;return a;} for(;;){if(a.length>=LIMITS.array)throw new ToolkitError('limit_exceeded');a.push(value(d+1));ws();const t=text[i++];if(t===']')return a;if(t!==',')fail();}}
  const rest=text.slice(i); const m=/^(?:-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|true|false|null)/.exec(rest);if(!m)fail(); i+=m[0].length;let v;try{v=JSON.parse(m[0]);}catch{fail();}if(typeof v==='number'&&!Number.isFinite(v))fail();return v;
 }
 const result=value(0);ws();if(i!==text.length)fail();return result;
}
export function readInput(path,kind) {
 let fd;try{const before=fs.statSync(path);if(!before.isFile())throw new ToolkitError('input_unreadable');if(before.size>LIMITS.bytes)throw new ToolkitError('limit_exceeded');fd=fs.openSync(path,'r');const actual=fs.fstatSync(fd);if(!actual.isFile() || actual.dev!==before.dev || actual.ino!==before.ino)throw new ToolkitError('input_unreadable');if(actual.size>LIMITS.bytes)throw new ToolkitError('limit_exceeded');const b=Buffer.alloc(LIMITS.bytes+1);let n=0;while(n<b.length){const x=fs.readSync(fd,b,n,b.length-n,null);if(!x)break;n+=x;}if(n>LIMITS.bytes)throw new ToolkitError('limit_exceeded');const after=fs.fstatSync(fd);if(before.size!==actual.size||actual.size!==after.size||n!==after.size)throw new ToolkitError('input_unreadable');let s;try{s=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(b.subarray(0,n));}catch{throw new ToolkitError('invalid_json');}if(s.charCodeAt(0)===0xfeff)s=s.slice(1);const v=parseInput(s);if(kind==='snapshot')return validateParsedSnapshot(v);if(kind==='arguments'&&!isPlain(v))throw new ToolkitError('invalid_snapshot');return v;
 }catch(e){if(e instanceof ToolkitError)throw e;throw new ToolkitError('input_unreadable');}finally{if(fd!==undefined)fs.closeSync(fd);}
}
