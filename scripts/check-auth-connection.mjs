import { readFile } from 'node:fs/promises'
function parse(text) { return Object.fromEntries(text.split(/\r?\n/).flatMap(line => { const match=line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)$/); if(!match)return []; let value=match[2].trim(); if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1); return [[match[1],value]] })) }
const configs=[]
for(const app of ['frontend','backend']){
 const env=parse(await readFile(app+'/.env.local','utf8').catch(()=>''))
 const url=env.NEXT_PUBLIC_SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL
 const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
 if(!url||!key){console.error(app+': add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to '+app+'/.env.local.');process.exitCode=1;continue}
 let serviceRole=false;try{serviceRole=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='service_role'}catch{}
 if(key.startsWith('sb_secret_')||serviceRole){console.error(app+': use a publishable/anon key, never a secret or service-role key.');process.exitCode=1;continue}
 try{const parsed=new URL(url);if(parsed.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(parsed.hostname))throw Error();if(parsed.pathname!=='/'||parsed.search||parsed.hash||parsed.username||parsed.password)throw Error()}catch{console.error(app+': invalid Supabase Project URL.');process.exitCode=1;continue}
 configs.push({app,url:new URL(url).origin,key})
}
if(configs.length===2&&configs[0].url!==configs[1].url){console.error('Frontend and backend point to different Supabase projects. Use the same project for authentication and private data.');process.exitCode=1}
for(const config of configs){
 try{
  const response=await fetch(config.url+'/auth/v1/settings',{headers:{apikey:config.key},signal:AbortSignal.timeout(15000)})
  if(!response.ok){console.error(config.app+': Auth settings request failed (HTTP '+response.status+'). Check the project URL and public key.');process.exitCode=1;continue}
  const settings=await response.json();console.log(config.app+': Supabase Auth is reachable. Email provider: '+(settings.external?.email?'enabled':'disabled')+'. Google provider: '+(settings.external?.google?'enabled':'disabled')+'.')
  if(!settings.external?.google)console.log('Enable Google under Supabase Authentication > Sign In / Providers to activate Google login.')
 }catch{console.error(config.app+': unable to reach Supabase Auth. Check the network and project configuration.');process.exitCode=1}
}
if(!process.exitCode)console.log('Read-only check passed. No account was created and no email was sent. Complete live login/Google tests in the browser.')
