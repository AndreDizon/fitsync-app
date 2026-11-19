/* Dry-run by default. No credentials, record contents or image data are printed. */
const fs=require('node:fs'),path=require('node:path'),{buildSync}=require('esbuild'),{createClient}=require('@supabase/supabase-js')
const env=path.resolve('backend/.env.local');if(fs.existsSync(env))process.loadEnvFile(env)
const js=buildSync({entryPoints:['backend/lib/private-data.ts'],bundle:true,platform:'node',format:'cjs',write:false}).outputFiles[0].text
const mod={exports:{}};new Function('require','module','exports',js)(require,mod,mod.exports)
const {encryptedTables,encryptRow,decryptRow,sealPhoto,openPhoto}=mod.exports
const apply=process.argv.includes('--apply'),rotate=process.argv.includes('--rotate')
async function main(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)throw new Error('Set the backend Supabase URL and server-only service role key.')
 // Verify the encryption key before touching any rows.
 mod.exports.seal({check:true},'configuration-check','configuration-check')
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
 console.log(apply?'APPLY: encrypting selected private records.':'DRY RUN: no records or files will be changed. Add --apply after reviewing counts.')
 let converted=0,photos=0,conflicts=0
 for(const table of encryptedTables){
  const identity=table==='daily_plan_weeks'?'week_start':'id';let offset=0,total=0,candidates=0
  while(true){
   const result=await client.from(table).select('*').order('user_id').order(identity).range(offset,offset+99)
   if(result.error)throw new Error('Cannot read '+table+'. Apply the private data encryption SQL migration first.')
   for(const row of result.data){
    total++
    if(!row.encrypted_data||rotate&&row.encrypted_data.keyId!==(process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY||'v1')){
     candidates++
     if(apply){
      const plain=decryptRow(table,row,row.user_id),revision=row.revision+1
      if(revision>=2147483647)throw new Error('Revision limit reached; conversion stopped.')
      const updated={...plain,revision,...(table==='daily_plan_weeks'?{document:{...plain.document,revision}}:{})}
      const encrypted=encryptRow(table,updated,row.user_id)
      const saved=await client.from(table).update(encrypted).eq('user_id',row.user_id).eq(identity,row[identity]).eq('revision',row.revision).select(identity)
      if(saved.error)throw new Error('Private record conversion failed; no plaintext fallback was used.')
      if(saved.data.length)converted++;else conflicts++
     }
    }
    if(table==='progress_entries'&&row.kind==='photo'){
     const filePath=row.user_id+'/'+row.id+'.jpg'
     const file=await client.storage.from('progress-photos').download(filePath,{cacheNonce:require('node:crypto').randomUUID()},{cache:'no-store'})
     if(file.error)throw new Error('Could not read a private photo; stopped before replacing it.')
     const bytes=Buffer.from(await file.data.arrayBuffer()),encrypted=bytes.subarray(0,4).toString()==='FSE1'
     const keyId=encrypted?bytes.subarray(5,5+bytes[4]).toString():null
     if(!encrypted||rotate&&keyId!==(process.env.PRIVATE_DATA_ENCRYPTION_ACTIVE_KEY||'v1')){
      photos++
      if(apply){
       const sealed=sealPhoto(openPhoto(bytes,row.user_id,row.id),row.user_id,row.id)
       const saved=await client.storage.from('progress-photos').update(filePath,sealed,{contentType:'application/octet-stream',cacheControl:'0'})
       if(saved.error)throw new Error('Photo conversion failed. Keep the original encryption keys and retry.')
      }
     }
    }
   }
   if(result.data.length<100)break;offset+=100
  }
  console.log(table+': '+total+' records; '+candidates+' need encryption/rotation.')
 }
 console.log('Photo candidates: '+photos+'. Updated records: '+converted+'. Concurrent-edit conflicts: '+conflicts+'.')
 if(conflicts)throw new Error('Some records changed during conversion. Pause writes and rerun; do not remove old keys.')
 console.log('Finished. Rerun dry-run to verify no remaining candidates. Old backups may still contain previous plaintext.')
}
main().catch(()=>{console.error('Migration stopped. Check configuration, SQL migration and connectivity. No secret values or private contents are printed. Do not discard encryption keys.');process.exitCode=1})
