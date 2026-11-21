export type Gym={id:string;name:string;description:string;join_mode?:'open'|'approval'|'invite';member_count?:number;join_code?:string;owner_id?:string}
export type GymMember={user_id:string;username:string;role:'admin'|'staff'|'member';joined_at:string}
export type GymAnnouncement={id:string;title:string;body:string;pinned:boolean;username:string;created_at:string;updated_at:string}
export type GymSession={id:string;title:string;description:string;starts_at:string;ends_at:string;capacity:number;attending:number;joined:boolean}
export type GymSharedPlaylist={id:string;name:string;description:string;duration:string;item_count:number;author_id:string|null;username:string}
export type GymMembership={gym:Gym|null;role?:GymMember['role'];members:GymMember[];pending?:{gym_id:string;name:string;created_at:string}|null;requests?:{user_id:string;username:string;created_at:string}[];bans?:{user_id:string;username:string}[];announcements?:GymAnnouncement[];sessions?:GymSession[];playlists?:GymSharedPlaylist[];activity?:{id:string;action:string;actor:string;target:string;created_at:string}[]}
export type GymAction=(action:string,doc:Record<string,unknown>,success:string)=>Promise<boolean>
export async function gymRequest(action:string,doc:Record<string,unknown>={},signal?:AbortSignal){
 const read=['mine','list','discussion','read_playlist'].includes(action)
 const response=await fetch('/api/gyms'+(read?'?'+new URLSearchParams(Object.entries({action,...doc}).map(([k,v])=>[k,String(v)])):''),{method:read?'GET':'POST',cache:'no-store',headers:read?undefined:{'Content-Type':'application/json'},body:read?undefined:JSON.stringify({action,doc}),signal:signal||AbortSignal.timeout(30000)})
 const data=await response.json().catch(()=>null)
 if(!response.ok)throw new Error(data?.error||'Could not load gyms. Try again.')
 if(!data||typeof data!=='object')throw new Error('The gym service returned an invalid response. Try again.')
 return data
}
