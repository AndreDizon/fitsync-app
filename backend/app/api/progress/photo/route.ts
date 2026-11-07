import sharp from 'sharp'
import { authenticate } from '../../../../lib/auth'
import { dateInZone, parseProgress } from '../../../../../shared/progress'
import { readCompletedOnboarding } from '../../../../../shared/onboarding'
export const dynamic='force-dynamic'
export const runtime='nodejs'
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}})
export async function POST(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const max=2200000;if(Number(request.headers.get('content-length'))>max)return json({error:'Choose an image under 2 MB after compression.'},413)
 const reader=request.body?.getReader();if(!reader)return json({error:'Choose a photo.'},400);const chunks:Uint8Array[]=[];let length=0
 try{while(true){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>max){await reader.cancel();return json({error:'Photo upload is too large.'},413)}chunks.push(next.value)}}catch{return json({error:'Photo upload was interrupted.'},400)}finally{reader.releaseLock()}
 try{
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 const form=await new Request('http://local/upload',{method:'POST',headers:{'content-type':request.headers.get('content-type')||''},body:bytes}).formData(),file=form.get('file')
 if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2097152)return json({error:'Use a JPEG, PNG or WebP image, up to 2 MB after compression.'},400)
 const id=crypto.randomUUID(),path=auth.user!.id+'/'+id+'.jpg',profile=readCompletedOnboarding(auth.user!.user_metadata.fitsync_onboarding)
 const entry=parseProgress({id,kind:'photo',date:form.get('date'),payload:{notes:form.get('notes')||''},revision:0},dateInZone(profile?.timeZone),path);if(!entry)return json({error:'Choose a valid date and a caption under 500 characters.'},400)
 let image:Buffer;try{image=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:20000000}).rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true}).jpeg({quality:85}).toBuffer()}catch{return json({error:'This image could not be decoded. Choose another JPEG, PNG or WebP photo.'},400)}
 const upload=await auth.client!.storage.from('progress-photos').upload(path,image,{contentType:'image/jpeg',cacheControl:'0',upsert:false});if(upload.error)return json({error:'Unable to upload. Run the Progress migration and check your connection.'},503)
 const saved=await auth.client!.from('progress_entries').insert({id,user_id:auth.user!.id,kind:'photo',date:entry.date,payload:entry.payload}).select('*').single()
 if(saved.error){await auth.client!.storage.from('progress-photos').remove([path]);return json({error:'Could not save the photo entry. Please retry.'},503)}return json({userId:auth.user!.id,data:saved.data},201)
 }catch{return json({error:'Invalid photo upload.'},400)}
}
