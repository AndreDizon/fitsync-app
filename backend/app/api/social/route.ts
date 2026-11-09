import sharp from 'sharp'
import { authenticate } from '../../../lib/auth'
import { readPlaylistBody } from '../../../lib/playlist-body'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const params=Object.fromEntries(new URL(request.url).searchParams)
 const result=await auth.client!.rpc('community_action',{action:params.action==='comments'?'comments':'list',doc:params})
 if(result.error)return json({error:result.error.code==='PGRST202'?'Run the Social migration to enable community features.':result.error.message},400)
 if(result.data?.posts)for(const post of result.data.posts){if(post.image_path){const signed=await auth.client!.storage.from('community-images').createSignedUrl(post.image_path,600);post.imageUrl=signed.data?.signedUrl||null}}
 return json(result.data)
}
export async function POST(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const parsed=await readPlaylistBody(request);if(parsed.response)return parsed.response
 const input=parsed.value as {action?:string;doc?:Record<string,unknown>}
 if(!input||!['create','edit','delete','heart','comment','deleteComment'].includes(input.action||'')||!input.doc)return json({error:'Invalid community action.'},400)
 const result=await auth.client!.rpc('community_action',{action:input.action,doc:input.doc})
 return result.error?json({error:result.error.code==='PGRST202'?'Run the Social migration first.':result.error.message},400):json(result.data)
}
export async function PUT(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const reader=request.body?.getReader();if(!reader)return json({error:'Choose an image.'},400)
 const chunks:Uint8Array[]=[];let size=0
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2097152){await reader.cancel();return json({error:'Image must be under 2 MB.'},413)}chunks.push(part.value)}}finally{reader.releaseLock()}
 try{const bytes=Buffer.concat(chunks);const image=await sharp(bytes,{limitInputPixels:20000000}).rotate().resize(1400,1400,{fit:'inside',withoutEnlargement:true}).jpeg({quality:82}).toBuffer();const path=auth.user!.id+'/'+crypto.randomUUID()+'.jpg';const result=await auth.client!.storage.from('community-images').upload(path,image,{contentType:'image/jpeg',upsert:false});if(result.error)return json({error:'Image upload failed. Check the Social migration and try again.'},503);const queued=await auth.client!.rpc('community_action',{action:'uploaded',doc:{path}});if(queued.error){await auth.client!.storage.from('community-images').remove([path]);return json({error:'Could not prepare this image. Please retry.'},503)}return json({path})}catch{return json({error:'Choose a valid JPEG, PNG or WebP image.'},400)}
}
