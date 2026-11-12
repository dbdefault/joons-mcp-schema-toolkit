// Test helper, distributed under the project's Apache-2.0 license.
const path=require('node:path');

function includeInCleanCopy(root,src) {
 const rel=path.relative(root,src);
 if(!rel)return true;
 const name=path.basename(src), lower=name.toLowerCase();
 if(name==='.git'||lower==='ref'||lower.startsWith('review'+'_scripts'))return false;
 if(lower.startsWith('review'+'_')&&lower.endsWith('.md'))return false;
 if(lower.endsWith('_internal.md'))return false;
 return !['failures.txt','integration_notes.md','interface_notes.md'].includes(lower);
}
module.exports={includeInCleanCopy};
