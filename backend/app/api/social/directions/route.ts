import { authenticate } from '../../../../lib/auth'
export const dynamic='force-dynamic'
type Route={coordinates:[number,number][];distance:number;duration:number}
const routes=new Map<string,{until:number;route:Route}>()
let nextRequest=0
export async function GET(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const params=new URL(request.url).searchParams,keys=['lat','lon','toLat','toLon'],values=keys.map(k=>Number(params.get(k)))
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
 if(keys.some(k=>!params.has(k))||values.some(v=>!Number.isFinite(v))||Math.abs(values[0])>90||Math.abs(values[2])>90||Math.abs(values[1])>180||Math.abs(values[3])>180||Math.abs(values[0]-values[2])>.2||Math.abs(values[1]-values[3])>.2)return json({error:'Choose a nearby destination.'},400)
 const [lat,lon,toLat,toLon]=values,key=values.map(n=>n.toFixed(5)).join(','),cached=routes.get(key)
 if(cached&&cached.until>Date.now())return json(cached.route)
 if(Date.now()<nextRequest)return json({error:'Please wait a moment before requesting another route.'},429)
 nextRequest=Date.now()+1100
 try{const response=await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${lon},${lat};${toLon},${toLat}?overview=full&geometries=geojson&alternatives=false`,{headers:{'User-Agent':'FitSync/1.0 (community walking directions)'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();const data=await response.json(),first=data.routes?.[0];if(data.code!=='Ok'||!first?.geometry?.coordinates?.length)return json({error:'No walking route was found. Open external directions below.'},404)
 const route:Route={coordinates:first.geometry.coordinates,distance:first.distance,duration:first.duration};if(routes.size>100)routes.clear();routes.set(key,{route,until:Date.now()+30*60000});return json(route)
 }catch{return json({error:'Walking routes are temporarily unavailable. Open external directions below.'},503)}
}
