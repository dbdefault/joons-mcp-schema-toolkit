import { guardJson } from '../core/schema.js';
export function makeFixtures(name, example) {
  // The caller must first apply W2 identifier safety and W1 example checks.
  guardJson(example);
  return {format:'joons-mcp-mock-server/fixtures',fixtureVersion:1,missingFixture:'error',scenarios:{},tools:{[name]:{match:[{arguments:example,response:{content:[{type:'text',text:'example'}]}}]}}};
}
