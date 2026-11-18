import { authenticate } from '../../../lib/auth'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const result=await auth.client!.from('user_notifications').select('id,feature,title,body,post_id,kind,created_at').eq('user_id',auth.user!.id).gte('created_at',new Date(Date.now()-30*86400000).toISOString()).order('created_at',{ascending:false}).limit(200)
 if(result.error)return Response.json({error:'Social notifications need the 20261118_notifications.sql migration.'},{status:503,headers:{'Cache-Control':'private, no-store'}})
 return Response.json({userId:auth.user!.id,notifications:result.data},{headers:{'Cache-Control':'private, no-store'}})
}
