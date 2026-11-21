import assert from 'node:assert/strict'
import {build} from 'esbuild'
const output=await build({entryPoints:['frontend/lib/gym-income.ts'],bundle:true,platform:'node',format:'esm',write:false})
const {incomeCsv,incomeMoney}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'))
const csv=incomeCsv([{received_on:'2026-11-21',member_name:'=HYPERLINK("bad")',plan_name:'  +formula',kind:'payment',amount:'123.45',currency:'PHP',method:'cash',voided:true,notes:'A "quoted", note\nwith a second line',void_reason:'Duplicate',recorded_by:'@someone',recorded_at:'2026-11-21T00:00:00Z',id:'id',payment_id:null}])
assert(csv.startsWith('\uFEFF'));assert(csv.includes("'=HYPERLINK"));assert(csv.includes("'  +formula"));assert(csv.includes("'@someone"));assert(csv.includes('A ""quoted"", note'));assert(csv.includes('"Voided"'));assert(csv.includes('"123.45"'))
assert.match(incomeMoney('0.30','PHP'),/0\.30/)
assert.match(incomeMoney('123.45','JPY'),/123\.45/)
console.log('PASS income CSV formula neutralization, quote/newline escaping, status/decimal preservation and currency formatting')
