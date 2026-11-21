import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'
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
    if(!input||!['create','join','leave','role','remove','update','disband'].includes(input.action||'')||!input.doc||typeof input.doc!=='object'||Array.isArray(input.doc))return json({error:'Invalid gym action.'},400)
    action=input.action!;doc=input.doc
  }else{
    const params=new URL(request.url).searchParams
    action=params.get('action')==='list'?'list':'mine'
    doc={q:params.get('q')||'',page:params.get('page')||'0'}
  }
  const result=await auth.client!.rpc('gym_group_action',{action,doc})
  if(result.error)return json({error:result.error.code==='PGRST202'?'Gym groups are not enabled yet. Ask the administrator to apply the gym groups migration.':result.error.message},result.error.code==='PGRST202'?503:400)
  return json(result.data)
}
export async function GET(request:Request){return run(request,false)}
export async function POST(request:Request){return run(request,true)}
