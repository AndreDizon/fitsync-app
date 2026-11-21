import assert from 'node:assert/strict'
import {build} from 'esbuild'
const bundle=async file=>{const b=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'))}
const {historyContainsDay,historyOverlaps}=await bundle('shared/gym-history.ts')
const {dateInZone}=await bundle('shared/progress.ts')
const range={from:'2026-11-01',to:'2026-11-30'}
assert(historyContainsDay('2026-11-01',range));assert(historyContainsDay('2026-11-30',range));assert(!historyContainsDay('2026-12-01',range))
assert(historyOverlaps('2026-10-01','2026-11-01',range),'Expiry day matches inclusively')
assert(historyOverlaps('2026-11-30','2026-12-30',range),'Start day matches inclusively')
assert(!historyOverlaps('2026-10-01','2026-10-31',range))
assert(historyOverlaps('2026-01-01','2027-01-01',range),'Coverage overlapping the range matches regardless of creation date')
assert(historyContainsDay('2020-01-01',{from:'',to:''}));assert(historyContainsDay('2020-01-01',{from:'',to:'2020-01-01'}))
assert(historyContainsDay(dateInZone('Asia/Manila',new Date('2026-10-31T16:00:00Z')),range),'Activity at Manila midnight uses the local November day')
console.log('PASS gym history: inclusive dates, open ranges, membership coverage overlap, timezone boundary')
