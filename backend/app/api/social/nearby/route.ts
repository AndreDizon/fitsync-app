import { authenticate } from '../../../../lib/auth'
export const dynamic='force-dynamic'
export const maxDuration=60
type Place={id:string;name:string;lat:number;lon:number;type:string;address:string}
const servers=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.private.coffee/api/interpreter']
const cache=new Map<string,{until:number;places:Place[]}>(),limits=new Map<string,number>(),cooldown=new Map<string,number>()
export async function GET(request:Request){
 const auth=await authenticate(request);if(auth.response)return auth.response
 const url=new URL(request.url),lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'))
 const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}})
 if(!url.searchParams.has('lat')||!url.searchParams.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return json({error:'A valid GPS position is required.'},400)
 const key=lat.toFixed(2)+','+lon.toFixed(2),saved=cache.get(key)
 if(saved&&saved.until>Date.now())return json({places:saved.places,cached:true})
 if((limits.get(auth.user!.id)||0)>Date.now())return json({error:'Please wait one minute between nearby searches.',retryAt:new Date(limits.get(auth.user!.id)!).toISOString()},429)
 if(limits.size>2000)limits.clear();limits.set(auth.user!.id,Date.now()+60000)
 // Query a rounded location so cached coverage is consistent; precise coordinates stay in the browser.
 const [a,b]=key.split(',')
 const query=`[out:json][timeout:8];(nwr(around:6000,${a},${b})[leisure~"^(fitness_centre|sports_centre|fitness_station)$"];nwr(around:6000,${a},${b})[healthcare=dietitian];nwr(around:6000,${a},${b})[sport~"^(yoga|fitness|bodybuilding)$"];);out center tags 120;`
 let retryAt:number|undefined
 for(const server of servers){
  if((cooldown.get(server)||0)>Date.now())continue
  try{const response=await fetch(server,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'FitSync/1.0 (community facility finder)'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(10000)})
   if(!response.ok){const retry=response.headers.get('retry-after');const when=retry?(Number.isFinite(Number(retry))?Date.now()+Number(retry)*1000:Date.parse(retry)):Date.now()+60000;cooldown.set(server,when);if(retry)retryAt=retryAt?Math.min(retryAt,when):when;continue}
   const data=await response.json();if(!Array.isArray(data.elements)||data.remark)continue
   const places:Place[]=data.elements.flatMap((p:{id:number;type:string;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>})=>{const t=p.tags||{},lat=p.lat??p.center?.lat,lon=p.lon??p.center?.lon;return lat===undefined||lon===undefined?[]:[{id:p.type+'/'+p.id,name:t.name||'Unnamed fitness facility',lat,lon,type:t.healthcare==='dietitian'?'Nutrition services':t.leisure==='fitness_station'?'Outdoor fitness':t.sport==='yoga'?'Yoga studio':'Gym / sports centre',address:[t['addr:street'],t['addr:city']].filter(Boolean).join(', ')}]})
   if(cache.size>150)cache.clear();cache.set(key,{until:Date.now()+15*60000,places});return json({places,attribution:'© OpenStreetMap contributors'})
  }catch{/* Try the next independently operated public endpoint. */}
 }
 return json({error:'Nearby search is temporarily unavailable across the free providers. '+(retryAt?'Try again after the provider retry time shown.':'No provider supplied a reset time. Please try again later.'),retryAt:retryAt?new Date(retryAt).toISOString():null},503)
}
