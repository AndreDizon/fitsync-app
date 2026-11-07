import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { build } from 'esbuild'
const jar = new Map(), calls = []
const user = { id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'person@example.com',email_confirmed_at:new Date().toISOString(),created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{} }
const jwt = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.test-signature'
const session = () => ({access_token:jwt,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,user})
let rejectLogin = false, failRequests = false
const server = createServer(async(req,res)=>{
 const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):null
 const url=new URL(req.url,'http://fixture');calls.push({method:req.method,path:url.pathname,grant:url.searchParams.get('grant_type'),scope:url.searchParams.get('scope'),body})
 if(failRequests){res.writeHead(503,{'content-type':'application/json'});res.end(JSON.stringify({msg:'Service unavailable'}));return}
 res.setHeader('content-type','application/json')
 if(url.pathname.endsWith('/token')){if(rejectLogin){res.writeHead(400);res.end(JSON.stringify({error_code:'invalid_credentials',msg:'fixture email does not exist'}))}else res.end(JSON.stringify(session()));return}
 if(url.pathname.endsWith('/signup')){res.end(JSON.stringify(user));return}
 if(url.pathname.endsWith('/recover')){res.end('{}');return}
 if(url.pathname.endsWith('/verify')){res.end(JSON.stringify(session()));return}
 if(url.pathname.endsWith('/user')){res.end(JSON.stringify(user));return}
 if(url.pathname.endsWith('/logout')){res.writeHead(204);res.end();return}
 res.writeHead(404);res.end('{}')
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
process.env.NEXT_PUBLIC_SUPABASE_URL=`http://127.0.0.1:${server.address().port}`
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public-key'
process.env.NEXT_PUBLIC_SITE_URL='http://localhost:3000';process.env.NODE_ENV='test'
globalThis.__authCookies={getAll:()=>[...jar].map(([name,value])=>({name,value})),set:(name,value)=>jar.set(name,value),delete:name=>jar.delete(name)}
class Redirect extends Error{constructor(url){super('redirect');this.url=url}}
globalThis.__authRedirect=url=>{throw new Redirect(url)}
async function load(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,platform:'node',format:'esm',tsconfig:'frontend/tsconfig.json',plugins:[{name:'next-runtime-fixture',setup(b){b.onResolve({filter:/^(server-only|next\/headers|next\/navigation|next\/cache|next\/server)$/},args=>({path:args.path,namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',contents:args.path==='next/headers'?'export const cookies=async()=>globalThis.__authCookies;export const headers=async()=>new Headers({host:"localhost:3000"});':args.path==='next/navigation'?'export const redirect=(url)=>globalThis.__authRedirect(url);':args.path==='next/cache'?'export const revalidatePath=()=>{};':args.path==='next/server'?'export const NextResponse={redirect:url=>new Response(null,{status:307,headers:{location:String(url)}})};':'export {}'}))}}]});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'))}
const form=fields=>{const data=new FormData();for(const [key,value]of Object.entries(fields))data.set(key,value);return data}
const action=await load('frontend/app/auth/actions.ts')
try {
 const invalid=await action.signup({},form({name:'J',email:'invalid',password:'short',confirmPassword:'different'}));assert(invalid.fieldErrors.name&&invalid.fieldErrors.email&&invalid.fieldErrors.password);assert.equal(calls.length,0)
 const pass='a unique test passphrase';let result=await action.signup({},form({name:'Jamie Davis',email:' Person@Example.com ',password:pass,confirmPassword:pass}));assert(result.message);assert(!JSON.stringify(result).includes(pass));const signup=calls.find(c=>c.path.endsWith('/signup'));assert.equal(signup.body.email,'person@example.com');assert.equal(signup.body.data.display_name,'Jamie Davis');assert(!signup.body.data.role)
 rejectLogin=true;result=await action.login({},form({email:'person@example.com',password:'wrong'}));assert(result.error);assert(!result.error.includes('does not exist'));rejectLogin=false
 jar.set('fitsync-local-tester','obsolete');await assert.rejects(action.login({},form({email:' Person@Example.com ',password:pass})),error=>error instanceof Redirect&&error.url==='/');assert(!jar.has('fitsync-local-tester'));assert([...jar.keys()].some(key=>key.includes('auth-token')))
 await action.forgotPassword({},form({email:'person@example.com'}));assert(calls.some(c=>c.path.endsWith('/recover')))
 result=await action.resetPassword({},form({password:pass,confirmPassword:'not matching'}));assert(result.fieldErrors.confirmPassword)
 await assert.rejects(action.resetPassword({},form({password:pass,confirmPassword:pass})),error=>error instanceof Redirect&&error.url==='/login?password=updated');assert(calls.some(c=>c.method==='PUT'&&c.path.endsWith('/user')&&c.body.password===pass));assert(calls.some(c=>c.path.endsWith('/logout')&&c.scope==='global'))
 let oauth;try{await action.googleSignIn({})}catch(error){assert(error instanceof Redirect);oauth=new URL(error.url)}assert.equal(oauth.searchParams.get('provider'),'google');assert.equal(oauth.searchParams.get('redirect_to'),'http://localhost:3000/auth/callback');assert(oauth.searchParams.get('code_challenge'));assert([...jar.keys()].some(key=>key.includes('code-verifier')))
 const callback=await load('frontend/app/auth/callback/route.ts');let response=await callback.GET({nextUrl:new URL('http://localhost:3000/auth/callback?code=test-code&next=https://attacker.example')});assert.equal(response.headers.get('location'),'http://localhost:3000/');assert(calls.some(c=>c.grant==='pkce'))
 await action.googleSignIn({}).catch(()=>{});response=await callback.GET({nextUrl:new URL('http://localhost:3000/auth/callback?code=test-code&next=/reset-password')});assert.equal(response.headers.get('location'),'http://localhost:3000/reset-password')
 const confirm=await load('frontend/app/auth/confirm/route.ts');response=await confirm.GET({nextUrl:new URL('http://localhost:3000/auth/confirm?token_hash=test-hash&type=recovery')});assert.equal(response.headers.get('location'),'http://localhost:3000/reset-password');response=await confirm.GET({nextUrl:new URL('http://localhost:3000/auth/confirm?token_hash=test-hash&type=admin')});assert.equal(response.headers.get('location'),'http://localhost:3000/login?error=link')
 console.log('PASS: actual Supabase SSR SDK -> isolated auth HTTP backend: signup, email login, cookie session, generic errors, recovery, password update/global logout, Google PKCE, callbacks and redirect allowlist. No live account was created.')
} finally { await new Promise(resolve=>server.close(resolve)) }
