import { analyzeSchema, own, plain } from './schema.js';
import { getSubset } from './subset.js';
import { ToolkitError } from '../errors.js';
const known=new Set([...getSubset().supported,...getSubset().annotations]);
export function lintSchema(schema,kind='input') {
 const analysis=analyzeSchema(schema,kind), findings=analysis.findings.slice(), stack=[[schema,'']];
 const add=(code,path,level)=>{if(findings.length>=10000) throw new ToolkitError('limit_exceeded'); findings.push({code,level,path});};
 const badPaths=new Set(analysis.findings.filter(f=>f.code!=='UNSUPPORTED_KEYWORD').map(f=>f.path.replace(/\/(?:type|enum|required|properties|additionalProperties|items|minLength|maxLength|minItems|maxItems|minimum|maximum|exclusiveMinimum|exclusiveMaximum)$/,'')));
 while(stack.length){const [s,p]=stack.pop(); if(!plain(s))continue;
   const keys=Object.keys(s), ts=Array.isArray(s.type)?s.type:[s.type];
   if(!badPaths.has(p)) {
     if(!keys.length)add('EMPTY_SCHEMA',p,'warn');
     if(!own(s,'type'))add('TYPE_MISSING',p,'warn');
     if((ts.includes('object')||own(s,'properties'))&&!own(s,'additionalProperties'))add('ADDITIONAL_PROPERTIES_UNDECIDED',p,'warn');
     if(p===''&&kind==='input'&&own(s,'type')&&!ts.includes('object'))add('NON_OBJECT_INPUT_SCHEMA',p,'warn');
     for(const k of keys) if(!known.has(k))add('UNKNOWN_KEYWORD',p,'warn');
     if(plain(s.properties)){const names=Object.keys(s.properties).sort(); for(let i=0;i<names.length;i++){const v=s.properties[names[i]]; if(plain(v)&&!(typeof v.description==='string'&&v.description.length))add('PROPERTY_DESCRIPTION_MISSING',p+'/properties/<property-'+(i+1)+'>','info');}}
   }
   if(plain(s.items))stack.push([s.items,p+'/items']);
   if(plain(s.additionalProperties))stack.push([s.additionalProperties,p+'/additionalProperties']);
   if(plain(s.properties)){const names=Object.keys(s.properties).sort(); for(let i=names.length-1;i>=0;i--)if(plain(s.properties[names[i]]))stack.push([s.properties[names[i]],p+'/properties/<property-'+(i+1)+'>']);}
 }
 return {status:analysis.status,findings};
}
