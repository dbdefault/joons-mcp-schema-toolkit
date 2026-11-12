import {redactText} from '../src/security/redact.js';
for(const s of ['%61'.repeat(333334),('a'.repeat(250)+'@').repeat(4000),'a@'.repeat(500000),'QUFB'.repeat(250000)]) {const t=performance.now();redactText(s);console.log(Math.round(performance.now()-t));}
