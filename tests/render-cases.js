import {makeReport} from '../src/output/report.js';
import {getSubset} from '../src/core/subset.js';
export function cases() {
  const f=(code,path='')=>({code,path,message:'PLANTED_MARKER'});
  const validate=makeReport('validate',[{name:'z',kind:'output',status:'incomplete',findings:[f('UNSUPPORTED_KEYWORD','/pattern')]},{name:'a',kind:'input',status:'invalid',findings:[f('TYPE_INVALID','/type')]}]);
  const lint=makeReport('lint',[{name:'a',kind:'input',status:'incomplete',findings:['EMPTY_SCHEMA','TYPE_MISSING','ADDITIONAL_PROPERTIES_UNDECIDED','PROPERTY_DESCRIPTION_MISSING','NON_OBJECT_INPUT_SCHEMA','UNKNOWN_KEYWORD'].map(c=>f(c))}]);
  const selected=[{name:'z',kind:'input',status:'invalid',findings:[f('REQUIRED_MISSING','/properties/<property-1>')]}]; selected.toolNames=['z','a'];
  const check=makeReport('check',selected);
  const unavailable=[{name:'z',kind:'input',status:'unavailable',findings:[]}]; unavailable.toolNames=['z','a'];
  const example=makeReport('example',unavailable);
  const subset=getSubset();
  return {validate,lint,check,example,subset};
}
