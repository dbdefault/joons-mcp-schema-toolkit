// Test helper, distributed under the project's Apache-2.0 license.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

export function runExampleForTool(name) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'joons-example-test-'));
  try {
    const snapshot=JSON.parse(fs.readFileSync('examples/snapshot.json','utf8'));
    snapshot.tools[0].name=name;
    snapshot.tools[0].inputSchema={type:'object'};
    const input=path.join(dir,'input.json'), output=path.join(dir,'output');
    fs.writeFileSync(input,JSON.stringify(snapshot));
    const result=spawnSync(process.execPath,[path.resolve('bin/joons-mcp-schema-toolkit.js'),'example','--snapshot',input,'--tool',name,'--out',output],{encoding:'utf8',windowsHide:true});
    const fixture=path.join(output,'fixtures.json');
    return {status:result.status,stderr:result.stderr,fixture:fs.existsSync(fixture)?JSON.parse(fs.readFileSync(fixture,'utf8')):null};
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
