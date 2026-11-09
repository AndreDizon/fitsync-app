import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'
import { dateInZone, validDate, habitStats, milestones, parseProgress } from '../../../../shared/progress'
import { readCompletedOnboarding } from '../../../../shared/onboarding'
export const dynamic='force-dynamic'
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
const schemaError=()=>json({error:'Run backend/migrations/20261110_progress.sql in Supabase to enable Progress storage.'},503)
export async function GET(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response;const client=auth.client!,user=auth.user!,profile=readCompletedOnboarding(user.user_metadata.fitsync_onboarding),today=dateInZone(profile?.timeZone)
 if(new URL(request.url).searchParams.get('summary')==='streak'){const visits=await client.from('progress_visits').select('date').eq('user_id',user.id).order('date',{ascending:false}).limit(1000);if(visits.error)return schemaError();return json({userId:user.id,streak:habitStats([],(visits.data||[]).map(row=>row.date),today).streak})}
 const [logs,visits,plans,awards]=await Promise.all([client.from('progress_entries').select('*').eq('user_id',user.id).order('date',{ascending:false}).order('created_at',{ascending:false}).limit(1000),client.from('progress_visits').select('date').eq('user_id',user.id).order('date',{ascending:false}).limit(1000),client.from('daily_plan_weeks').select('document,revision').eq('user_id',user.id).order('week_start',{ascending:false}).limit(1000),client.from('progress_awards').select('code,awarded_at').eq('user_id',user.id)])
 if(logs.error||visits.error||plans.error||awards.error)return schemaError()
 const weeks=(plans.data||[]).map(row=>({...row.document,revision:row.revision})),dates=(visits.data||[]).map(row=>row.date),stats=habitStats(weeks,dates,today),earned=new Set((awards.data||[]).map(row=>row.code));const newly=milestones.filter(b=>!earned.has(b.code)&&stats[b.metric]>=b.target)
 let awardWarning='';if(newly.length){const saved=await client.from('progress_awards').upsert(newly.map(b=>({user_id:user.id,code:b.code})),{onConflict:'user_id,code',ignoreDuplicates:true}).select('code,awarded_at');if(saved.error)awardWarning='Milestones could not be saved yet. Refresh to retry.';else awards.data?.push(...saved.data||[])}
 const entries=await Promise.all((logs.data||[]).map(async row=>{if(row.kind!=='photo')return row;const path=row.payload.path;if(path!==user.id+'/'+row.id+'.jpg')return{...row,photoUrl:null};const signed=await client.storage.from('progress-photos').createSignedUrl(path,600);return{...row,photoUrl:signed.data?.signedUrl||null}}))
 return json({userId:user.id,entries,visits:dates,weeks,awards:awards.data||[],today,awardWarning,limited:logs.data?.length===1000||plans.data?.length===1000||visits.data?.length===1000})
}
export async function POST(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response;const body=await readPlaylistBody(request);if(body.response)return body.response;const profile=readCompletedOnboarding(auth.user!.user_metadata.fitsync_onboarding),today=dateInZone(profile?.timeZone)
 if((body.value as {action?:string})?.action==='visit'){const date=(body.value as {date?:unknown}).date??today;if(!validDate(date)||date>today)return json({error:'Invalid visit date.'},400);const result=await auth.client!.from('progress_visits').upsert({user_id:auth.user!.id,date},{onConflict:'user_id,date',ignoreDuplicates:true});if(result.error)return schemaError();return json({userId:auth.user!.id,date})}
 const entry=parseProgress(body.value,today);if(!entry||entry.kind==='photo'||entry.revision!==0)return json({error:'Check your date and measurements. Choose at least one value; future dates are not allowed.'},400)
 const result=await auth.client!.from('progress_entries').insert({id:entry.id,user_id:auth.user!.id,kind:entry.kind,date:entry.date,payload:entry.payload}).select('*').single();if(result.error?.code==='23505'){const existing=await auth.client!.from('progress_entries').select('*').eq('user_id',auth.user!.id).eq('id',entry.id).maybeSingle();const canonical=existing.data?parseProgress(existing.data,today):null;if(canonical&&canonical.kind===entry.kind&&canonical.date===entry.date&&JSON.stringify(canonical.payload)===JSON.stringify(entry.payload))return json({userId:auth.user!.id,data:existing.data});return json({error:'This entry already exists. Refresh before editing.'},409);}if(result.error)return schemaError();return json({userId:auth.user!.id,data:result.data},201)
}
export async function PUT(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response;const body=await readPlaylistBody(request);if(body.response)return body.response;const raw=body.value as {id?:string};if(!raw?.id)return json({error:'Invalid entry.'},400)
 const existing=await auth.client!.from('progress_entries').select('*').eq('user_id',auth.user!.id).eq('id',raw.id).maybeSingle();if(existing.error)return json({error:'Unable to load this entry.'},400);if(!existing.data)return json({error:'Entry not found.'},404)
 const profile=readCompletedOnboarding(auth.user!.user_metadata.fitsync_onboarding),entry=parseProgress(body.value,dateInZone(profile?.timeZone),existing.data.kind==='photo'?existing.data.payload.path:undefined)
 if(!entry||entry.kind!==existing.data.kind)return json({error:'Invalid date or entry values.'},400)
 const saved=await auth.client!.from('progress_entries').update({date:entry.date,payload:entry.payload,revision:entry.revision+1}).eq('user_id',auth.user!.id).eq('id',entry.id).eq('revision',entry.revision).select('*').maybeSingle();if(saved.error)return json({error:'Unable to update this entry.'},503);if(!saved.data)return json({error:'Entry changed on another device. Refresh before editing.'},409);return json({userId:auth.user!.id,data:saved.data})
}
export async function DELETE(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response;const url=new URL(request.url),id=url.searchParams.get('id'),revision=Number(url.searchParams.get('revision'));if(!id||!Number.isInteger(revision)||revision<1)return json({error:'Invalid entry.'},400)
 const removed=await auth.client!.from('progress_entries').delete().eq('user_id',auth.user!.id).eq('id',id).eq('revision',revision).select('id,kind,payload').maybeSingle();if(removed.error)return json({error:'Unable to delete this entry.'},503);if(!removed.data)return json({error:'Entry changed or was deleted. Refresh before retrying.'},409)
 let warning='';if(removed.data.kind==='photo'&&removed.data.payload.path===auth.user!.id+'/'+removed.data.id+'.jpg'){const result=await auth.client!.storage.from('progress-photos').remove([removed.data.payload.path]);if(result.error)warning='Entry deleted, but its private image could not be removed from storage. Contact support with entry ID '+removed.data.id+'.'}
 return json({userId:auth.user!.id,warning})
}
