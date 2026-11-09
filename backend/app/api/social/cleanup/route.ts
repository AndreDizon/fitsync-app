import { createClient } from '@supabase/supabase-js'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!=='Bearer '+process.env.CRON_SECRET)return Response.json({error:'Unauthorized'},{status:401})
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,url=process.env.NEXT_PUBLIC_SUPABASE_URL
 if(!key||!url)return Response.json({error:'Configure the backend service role key for image cleanup.'},{status:503})
 const client=createClient(url,key,{auth:{persistSession:false}}),purge=await client.rpc('purge_community')
 if(purge.error)return Response.json({error:'Social purge failed.'},{status:503})
 const queued=await client.from('community_image_cleanup').select('path').lt('queued_at',new Date(Date.now()-3600000).toISOString()).limit(100)
 if(queued.error)return Response.json({error:'Image cleanup queue unavailable.'},{status:503})
 const paths=(queued.data||[]).map(row=>row.path)
 if(paths.length){const removed=await client.storage.from('community-images').remove(paths);if(removed.error)return Response.json({error:'Image cleanup will retry on the next run.'},{status:503});await client.from('community_image_cleanup').delete().in('path',paths)}
 return Response.json({ok:true,imagesRemoved:paths.length})
}
