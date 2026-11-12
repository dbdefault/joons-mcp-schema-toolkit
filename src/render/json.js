import {safeRenderValue} from '../output/report.js';
export function renderJson(value) { return JSON.stringify(safeRenderValue(value), null, 2) + '\n'; }
