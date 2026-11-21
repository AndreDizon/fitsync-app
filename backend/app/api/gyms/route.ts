import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'
import { playlistResult } from '../../../lib/playlist-record'
import { isUUID, parsePlaylist } from '../../../../shared/playlists'
export const dynamic='force-dynamic'
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
async function run(request:Request,write:boolean){
  const auth=await authenticate(request)
  if(auth.response)return auth.response
  let action:string,doc:Record<string,unknown>
  if(write){
    const parsed=await readPlaylistBody(request)
    if(parsed.response)return parsed.response
    const input=parsed.value as {action?:string;doc?:Record<string,unknown>}|null
    if(!input||!['create','join','cancel_request','approve','reject','leave','role','remove','update','disband','announce','edit_announcement','pin','delete_announcement','message','delete_message','schedule','cancel_session','rsvp','unrsvp','share_playlist','unshare_playlist','transfer','ban','unban'].includes(input.action||'')||!input.doc||typeof input.doc!=='object'||Array.isArray(input.doc))return json({error:'Invalid gym action.'},400)
    action=input.action!;doc=input.doc
  }else{
    const params=new URL(request.url).searchParams
    action=['list','discussion','read_playlist'].includes(params.get('action')||'')?params.get('action')!:'mine'
    doc={q:params.get('q')||'',page:params.get('page')||'0',id:params.get('id')||''}
  }
  if(action==='share_playlist'){
    if(!isUUID(doc.playlistId))return json({error:'Choose one of your saved workout playlists.'},400)
    const source=await auth.client!.from('plan_playlists').select('*').eq('id',doc.playlistId).eq('user_id',auth.user!.id).eq('kind','workout').maybeSingle()
    if(source.error)return json({error:'Could not load your playlist. Check syncing and try again.'},503)
    if(!source.data)return json({error:'This workout playlist is not saved to your account yet.'},400)
    const parsed=parsePlaylist(playlistResult(source.data))
    if(!parsed.data||!parsed.data.items.length)return json({error:parsed.error||'Add an exercise before sharing this playlist.'},400)
    // Share a sanitized snapshot, never the encrypted record or private account fields.
    doc={playlist:parsed.data}
  }
  const result=await auth.client!.rpc('gym_group_action_v2',{action,doc})
  if(result.error)return json({error:result.error.code==='PGRST202'?'Gym community tools are not enabled yet. Apply the gym groups and gym community migrations.':result.error.message},result.error.code==='PGRST202'?503:400)
  return json(result.data)
}
export async function GET(request:Request){return run(request,false)}
export async function POST(request:Request){return run(request,true)}
