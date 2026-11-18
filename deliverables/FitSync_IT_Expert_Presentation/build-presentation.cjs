// Rebuild: node deliverables/FitSync_IT_Expert_Presentation/build-presentation.cjs
// Tools are kept outside the application dependencies, under TEMP.
const fs = require('node:fs'), path = require('node:path')
const pptxgen = require(path.join(process.env.TEMP, 'fitsync-presentation-tools/node_modules/pptxgenjs'))
const sharp = require('sharp')
const OUT = __dirname, ASSETS = path.join(OUT, 'assets')
const C = { white:'FFFFFF', ink:'242A2D', gray:'59646C', line:'DDE3E7', yellow:'FFE135', pale:'FFF8D5', orange:'FF8B37', peach:'FFF0E4', brown:'744A2E', blue:'EAF3FC', blueInk:'315B86', pink:'FBEFF5', purple:'F2ECFA' }
const ppt = new pptxgen()
ppt.layout = 'LAYOUT_WIDE'
ppt.author = 'KEYSTOKES | University of the Assumption'
ppt.subject = 'FitSync capstone prototype presentation for IT expert evaluation'
ppt.title = 'FitSync — IT Expert Presentation'
ppt.company = 'KEYSTOKES'
ppt.lang = 'en-PH'
ppt.theme = { headFontFace:'Arial', bodyFontFace:'Arial', lang:'en-PH' }
const S = ppt.ShapeType, W=13.333333, H=7.5, notes=[]
const dimensions = new Map()
function contain(file,x,y,w,h) {
  const d=dimensions.get(file), scale=Math.min(w/d.width,h/d.height), iw=d.width*scale, ih=d.height*scale
  return {x:x+(w-iw)/2,y:y+(h-ih)/2,w:iw,h:ih}
}
function text(s, str, x,y,w,h, size=18, color=C.ink, more={}) {
  s.addText(str,{x,y,w,h,fontFace:'Arial',fontSize:size,color,margin:0,breakLine:false,vertAnchor:'top',valign:'top',paraSpaceAfterPt:0,...more})
}
function box(s,x,y,w,h,fill=C.white,line=C.line,r=.15) {
  s.addShape(S.roundRect,{x,y,w,h,rectRadius:r,radius:r,fill:{color:fill},line:{color:line,width:.8},radius:r,shadow:{type:'outer',color:'17232A',opacity:.05,blur:3,angle:90,distance:1}})
}
function line(s,x1,y1,x2,y2,color=C.line,width=.8,extra={}) { s.addShape(S.line,{x:Math.min(x1,x2),y:Math.min(y1,y2),w:Math.abs(x2-x1),h:Math.abs(y2-y1),flipH:x2<x1,flipV:y2<y1,line:{color,width,...extra}}) }
function tag(s,str,x,y,w,fill=C.yellow,ink=C.ink) { box(s,x,y,w,.33,fill,fill);text(s,str,x+.12,y+.08,w-.24,.17,9.8,ink,{bold:true}) }
function flowArt(s,x,y,w=3,color='CDB565') {
  [0,.16,.32].forEach(d=>{
    line(s,x,y+.6+d,x+w*.34,y+.6+d,color,.8)
    line(s,x+w*.34,y+.6+d,x+w*.57,y+.15+d,color,.8)
    line(s,x+w*.57,y+.15+d,x+w,y+.15+d,color,.8)
  })
}
function footer(s,n,src='') {
  line(s,.65,7.05,12.68,7.05)
  text(s,'KEYSTOKES  /  FITSYNC',.65,7.18,3,.16,9,C.gray,{bold:true,charSpacing:.7})
  if(src)text(s,src,3.65,7.16,8.25,.22,8.3,C.gray,{align:'right'})
  text(s,String(n).padStart(2,'0'),12.14,7.15,.52,.22,10,C.ink,{align:'right',bold:true})
}
function page(kicker,title,subtitle='',opts={}) {
  const s=ppt.addSlide();s.background={color:opts.bg||C.white}
  text(s,kicker.toUpperCase(),.65,.39,10,.2,10,C.brown,{bold:true,charSpacing:1.5})
  text(s,title,.65,.9,12.0,.64,opts.titleSize||32,C.ink,{bold:true})
  if(subtitle)text(s,subtitle,.65,1.67,11.9,.54,16,C.gray)
  return s
}
function note(s,title,body,sources=[]) {
  const n=ppt._slides.length
  const content=body+'\n\nSources / implementation evidence:\n'+sources.map(v=>'- '+v).join('\n')
  s.addNotes(content)
  notes.push({n,title,body,sources})
}
function icon(s,name,x,y,color=C.ink,size=.33) {
  const p=path.join(ASSETS,'icon-'+name+'-'+color+'.png');s.addImage({path:p,x,y,w:size,h:size})
}
function card(s,{x,y,w,h,title,body,fill=C.white,accent=C.yellow,ic}) {
  box(s,x,y,w,h,fill)
  if(ic){box(s,x+.22,y+.22,.48,.48,accent,accent);icon(s,ic,x+.3,y+.3,C.ink,.32)}
  text(s,title,x+.23,y+(ic?.85:.23),w-.46,.5,20,C.ink,{bold:true})
  text(s,body,x+.23,y+(ic?1.4:.85),w-.46,h-(ic?1.58:1.03),16,C.gray,{breakLine:false})
}
async function main(){
  fs.mkdirSync(ASSETS,{recursive:true})
  const mascots={logo:'fox-logo-192',workout:'fox-plan-workout-960',nutrition:'fox-plan-nutrition-960',greeting:'fox-greeting-960',earth:'social-connected-earth-960',progress:'hero-progress-document-768'}
  for(const [name,file] of Object.entries(mascots)) {
    const dest=path.join(ASSETS,name+'.png')
    await sharp(path.join('frontend/public/mascot/optimized',file+'.webp')).png().toFile(dest)
    dimensions.set(dest,await sharp(dest).metadata())
  }
  const icons={
    shield:'<path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6Z"/><path d="m8 12 3 3 5-6"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    plan:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 4h2"/>',
    food:'<path d="M6 3v6m-3-6v6c0 4 6 4 6 0V3M6 12v9m12-18v18m0-18c-4 3-5 10 0 10"/>',
    chart:'<path d="M3 3v18h18M7 15l4-5 4 3 6-8"/>',
    people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m3 3c3 1 3 4 3 8"/>',
    check:'<path d="m4 12 5 5L20 5"/>',
    database:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/>',
    dumbbell:'<path d="m6 4 3 3-5 5-3-3m16 3 3 3-5 5-3-3M7 10l7 7m-3-11 7 7m-9-5 7 7"/>',
    sync:'<path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/>',
    user:'<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  }
  for(const [name,paths] of Object.entries(icons))for(const color of [C.ink,C.white,C.blueInk,C.brown])await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="#'+color+'" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg>')).png().toFile(path.join(ASSETS,'icon-'+name+'-'+color+'.png'))
  // 01 — Opening
  {
    const s=ppt.addSlide();s.background={color:C.pale}
    s.addShape(S.rect,{x:8.9,y:0,w:4.44,h:H,fill:{color:C.yellow},line:{color:C.yellow}})
    flowArt(s,8.1,5.66,5.3,'D4AD2B')
    s.addImage({path:path.join(ASSETS,'logo.png'),x:.65,y:.45,w:.55,h:.55})
    text(s,'KEYSTOKES',1.35,.57,5,.25,15,C.ink,{bold:true,charSpacing:1.2})
    tag(s,'CAPSTONE  /  IT EXPERT PRESENTATION',.7,1.53,4.1)
    text(s,'FitSync',.65,2.15,7.5,1.25,70,C.ink,{bold:true})
    text(s,'Work out. Eat well.\nKeep it together.',.7,3.52,7.3,1.25,34,C.ink,{bold:true})
    text(s,'FITSYNC: AN AI-DRIVEN PLATFORM FOR SMARTER\nWORKOUT AND NUTRITION PLANNING',.72,5.17,7.5,.7,16,C.brown,{bold:true})
    s.addImage({path:path.join(ASSETS,'workout.png'),...contain(path.join(ASSETS,'workout.png'),8.33,.7,4.8,4.45)})
    box(s,9.15,4.85,3.35,1.25,C.white,C.white)
    text(s,'Workout + nutrition',9.4,5.1,2.85,.32,20,C.ink,{bold:true})
    text(s,'One connected daily routine.',9.4,5.61,2.85,.23,13,C.gray)
    text(s,'4th-year BSIT students\nUniversity of the Assumption • Pampanga',.72,6.42,8,.53,14,C.gray)
    note(s,'Opening','Good day. We are KEYSTOKES, a group of four fourth-year Bachelor of Science in Information Technology students from the University of the Assumption in Pampanga. Today, we are presenting our capstone, FitSync: An AI-Driven Platform for Smarter Workout and Nutrition Planning. We will introduce the problem, explain the current prototype and its design and safeguards, then demonstrate the app for your technical evaluation. Suggested timing: 25 seconds.', ['User brief; manuscript PDF page 1 (title and author list).'])
  }
  // 02 — Team
  {
    const s=page('Meet the researchers','We are KEYSTOKES.','Four 4th-year BSIT students from the University of the Assumption, Pampanga.')
    const names=[['Christian Andre R.','Dizon','CD'],['Coeli Therese G.','Brillante','CB'],['Loraine Ann S.','Escritor','LE'],['Brian Noel M.','Mendoza','BM']]
    names.forEach((n,i)=>{const x=.65+(i%2)*6.13,y=2.57+Math.floor(i/2)*1.65;box(s,x,y,5.88,1.38,[C.blue,C.pink,C.purple,C.peach][i]);box(s,x+.24,y+.3,.69,.69,C.white,C.white);text(s,n[2],x+.28,y+.48,.61,.3,16,C.brown,{align:'center',bold:true});text(s,n[0],x+1.17,y+.3,4.4,.32,20,C.gray);text(s,n[1],x+1.17,y+.76,4.4,.45,25,C.ink,{bold:true})})
    footer(s,2,'Names follow the manuscript title page.')
    note(s,'Introduce the members','Our members are Christian Andre R. Dizon, Coeli Therese G. Brillante, Loraine Ann S. Escritor and Brian Noel M. Mendoza. Each member can briefly introduce themselves here. Keep this introduction short and move into why the experts are being invited. Do not invent project roles or credentials that the group has not agreed on. Suggested timing: 20–30 seconds.', ['Manuscript PDF page 1.'])
  }
  // 03 — Purpose
  {
    const s=page('Why we are here','Your technical feedback will shape FitSync.','We are inviting IT experts as respondents for our capstone evaluation.')
    const cols=[['Functionality','Do the workflows and features work as intended?','check',C.blue],['Usability & performance','Is the system clear, responsive and practical to use?','chart',C.peach],['Security & reliability','Are access controls, data handling and recovery appropriate?','shield',C.purple]]
    cols.forEach((v,i)=>card(s,{x:.65+i*4.08,y:2.52,w:3.86,h:2.83,title:v[0],body:v[1],ic:v[2],fill:v[3]}))
    box(s,.65,5.75,12.03,.79,C.pale,C.pale);text(s,'Today: system overview → live demonstration → structured feedback',.93,6.0,11.4,.3,20,C.ink,{bold:true})
    footer(s,3,'Evaluation is guided by ISO/IEC 25010; this is not a certification claim.')
    note(s,'Purpose of the expert presentation','We are presenting FitSync because IT experts are included in the evaluation activity for our capstone. We would like your feedback on whether its features work correctly, whether the experience is usable and efficient, and whether its security and data-handling decisions are suitable. Our manuscript uses ISO/IEC 25010 as the software-quality framework. We are not claiming certification or reporting evaluation results yet. Following the demo, we will use the approved research instrument and consent process. Presenter check: Chapter III explicitly describes IT experts validating instruments and local users providing survey responses; confirm the formal IT-expert respondent role with the adviser and approved instrument. Suggested timing: 35 seconds.', ['User request; manuscript PDF pages 17–18, 25–27.'])
  }
  // 04 — System
  {
    const s=page('What FitSync is','One place for movement, meals and progress.','A mobile-responsive web prototype that turns personal preferences into an editable daily routine.')
    box(s,.65,2.49,3.62,3.82,C.ink,C.ink)
    text(s,'The problem',.93,2.8,3.1,.4,24,C.white,{bold:true})
    text(s,'Scattered apps.\nRepeated logging.\nHard-to-review progress.',.93,3.48,3.03,1.7,24,C.white,{breakLine:false})
    text(s,'Study context: Unisite Subdivision,\nDel Pilar, San Fernando, Pampanga.',.93,5.43,3.03,.5,12,'DCE3E7')
    const steps=[['Tell us your needs','Goals, schedule, equipment and food preferences.'],['Build your day','Suggested or manual workout and meal schedules.'],['Review & adjust','Log completion, water and progress over time.']]
    steps.forEach((v,i)=>{const y=2.5+i*1.27;box(s,4.67,y,8.01,1.06,i===1?C.pale:C.white);tag(s,String(i+1),4.9,y+.28,.38);text(s,v[0],5.52,y+.2,6.82,.28,19,C.ink,{bold:true});text(s,v[1],5.52,y+.64,6.8,.24,14,C.gray)})
    footer(s,4,'Decision support and organization; not a medical diagnosis or treatment service.')
    note(s,'System summary and problem','The manuscript identifies fragmented tools, manual tracking fatigue and difficulty reviewing progress among local fitness users. FitSync brings workout planning, meal scheduling, hydration and progress records into one interface. Users first provide preferences through onboarding. They can then generate an editable draft, create a playlist manually, or choose reference items from the libraries. Marking items done updates the summaries. The current implementation is a responsive web application, not a published native Android or iOS app. Suggested timing: 40 seconds.', ['Manuscript PDF pages 2–5; README.md; shared/onboarding.ts; shared/daily-plans.ts.'])
  }
  // 05 — Design
  {
    const s=page('Why it looks this way','Sporty enough to move. Soft enough for everyday use.','FitSync combines workout and nutrition planning; it is designed for more than the gym.')
    box(s,.65,2.53,5.25,3.82,C.pale,C.pale)
    s.addImage({path:path.join(ASSETS,'workout.png'),...contain(path.join(ASSETS,'workout.png'),.78,2.7,2.65,3.33)})
    s.addImage({path:path.join(ASSETS,'nutrition.png'),...contain(path.join(ASSETS,'nutrition.png'),3.0,2.7,2.7,3.33)})
    text(s,'Workout + nutrition, one visual language',.91,6.06,4.73,.24,12,C.brown,{bold:true,align:'center'})
    const details=[['White + charcoal','Readable structure and calm information surfaces.'],['Pulse yellow + energy orange','Clear actions, selected states and sporty accents.'],['Soft clay + frosted glass','Rounded, lightly textured cards with subtle depth.'],['Blue, pink & purple','Topic-based accents distinguish sections and records.']]
    details.forEach((v,i)=>{const y=2.56+i*.94;box(s,6.32,y,.34,.34,[C.white,C.yellow,C.peach,C.blue][i]);text(s,v[0],6.9,y-.01,5.65,.26,18,C.ink,{bold:true});text(s,v[1],6.9,y+.39,5.67,.31,13.5,C.gray)})
    footer(s,5,'Responsive layouts • consistent actions • readable contrast • reduced-motion support')
    note(s,'Frontend design rationale','Our visual direction intentionally combines fitness energy with a welcoming nutrition and lifestyle experience. Pulse yellow highlights most actions and selected states. Performance white and charcoal provide structure, while orange and brown add warmth. Blue, pink and purple separate subject areas. The cards use subtle clay-like depth and translucent surfaces, rather than an aggressive gym-only appearance. The fox mascot creates continuity across pages. These are design intentions, not proof of usability; expert feedback and user evaluation are needed to confirm readability, accessibility and comfort on different screens. Suggested timing: 40 seconds.', ['User-approved FitSync palette and design direction; frontend/app/home-surfaces.css; frontend/app/shared-app-design.css; frontend/components/home-theme-preview.tsx.'])
  }
  // 06 — Stack
  {
    const s=page('Current technology stack','A typed web app with a protected data layer.','The prototype uses separate frontend and backend workspaces, with shared calculation and validation logic.')
    const x=[.65,4.75,8.85], w=3.83
    const layers=[['Frontend','Next.js 16 + React 19\nTypeScript + CSS / Tailwind\nLucide icons + responsive UI',C.blue,'user'],['Backend','Next.js route handlers\nNode.js 24 + TypeScript\nServer-side input validation',C.ink,'shield'],['Managed services','Supabase Auth + PostgreSQL\nPrivate Storage + RLS\nVercel hosting',C.peach,'database']]
    layers.forEach((v,i)=>{box(s,x[i],2.53,w,2.55,v[2],v[2]);icon(s,v[3],x[i]+.25,2.8,i===1?C.white:C.ink,.36);text(s,v[0],x[i]+.25,3.31,w-.5,.35,23,i===1?C.white:C.ink,{bold:true});text(s,v[1],x[i]+.25,3.96,w-.5,.83,15,i===1?'E7EDF1':C.gray,{breakLine:false})})
    ;[4.58,8.68].forEach(xx=>line(s,xx,3.75,xx+.13,3.75,C.gray,1.8,{endArrowType:'triangle'}))
    box(s,.65,5.47,12.03,.93,C.pale,C.pale)
    text(s,'AI boundary',.9,5.68,1.8,.27,18,C.brown,{bold:true})
    text(s,'OpenRouter powers the optional fitness chat. Daily plan generation is a rule-based engine, not an LLM.',2.68,5.68,9.68,.49,15,C.ink)
    footer(s,6,'Current code: package manifests, shared/ logic and backend/app/api/coach/route.ts.')
    note(s,'Technology stack and AI boundary','The current frontend uses Next.js 16, React 19 and TypeScript, with CSS/Tailwind and Lucide icons. The backend is a separate Next.js workspace running route handlers on Node.js 24. Shared TypeScript modules contain planning calculations and validation. Supabase provides authentication, PostgreSQL and private object storage, while the frontend and backend are deployed as Vercel projects. The optional chat assistant calls externally hosted models through OpenRouter. We did not train a custom model. The current daily planner uses explicit rules and catalog values; it does not ask an LLM to generate the schedule. The manuscript proposes React Native, adaptive generative planning and computer vision. Those should be presented as proposed scope rather than implemented functionality. Suggested timing: 50 seconds.', ['frontend/package.json; backend/package.json; docs/ai/ARCHITECTURE.md; backend/app/api/coach/route.ts; manuscript PDF pages 8–10.'])
  }
  // 07 — Security / identity
  {
    const s=page('Security / identity & access','Protect the account before personal data loads.','Authentication proves identity; protected routes and backend checks enforce access.')
    const rows=[
      ['Sign-up & sign-in','Supabase Auth handles passwords and Google identity. New Google users set a separate FitSync password.','user',C.blue],
      ['Password recovery','Generic email responses avoid account disclosure. Verified links lead to a 15-minute, one-use form grant.','mail',C.pale],
      ['Protected routes & logout','Server checks guard app pages and APIs. Logout clears the session and private device copies.','lock',C.peach],
    ]
    rows.forEach((v,i)=>{const y=2.5+i*1.13;box(s,.65,y,12.03,.95,v[3]);icon(s,v[2],.94,y+.27,C.ink,.37);text(s,v[0],1.55,y+.16,3.1,.6,19,C.ink,{bold:true});text(s,v[1],4.92,y+.17,7.45,.6,15,C.gray)})
    text(s,'New auth controls: implemented locally; hosted setup and signed-in delivery tests remain.',.88,6.22,11.55,.29,13,C.brown,{bold:true})
    footer(s,7,'Supabase Auth + server validation; no passwords or service keys are shown in the presentation.')
    note(s,'Security: accounts, recovery and sessions','Supabase Auth handles credential storage; FitSync does not store plaintext passwords. Email registration collects a username, email and confirmed password, while Google supplies a verified identity and the setup page requests a separate FitSync password. Password recovery returns the same public response for valid addresses regardless of account existence or delivery errors. Supabase verifies the email token; the app also checks a signed HttpOnly session-bound grant that expires after 15 minutes and is atomically consumed before a password update. Protected routes redirect signed-out visitors and backend endpoints verify tokens independently. Local private copies are cleared at logout, with a pending-edit check in the normal sign-out flow. Important: new account-security work is local and requires its migration, server secrets and live-account tests before the hosted demo can claim it works there. Suggested timing: 55 seconds.', ['frontend/proxy.ts; frontend/app/auth/actions.ts; frontend/lib/auth/recovery.ts; backend/lib/auth.ts; backend/migrations/20261118_account_security.sql; AUTH_SETUP.md; https://supabase.com/docs/guides/auth/passwords; https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html'])
  }
  // 08 — Security / data
  {
    const s=page('Security / data & privacy','Keep personal records separate and controllable.','Access checks apply to saved plans, progress records, private photos and sensitive account actions.')
    const specs=[['Owner-based access','PostgreSQL RLS restricts private rows to the signed-in owner. The server derives the user ID.','database',C.blue],['Private photos','Private Storage bucket; short-lived signed viewing links rather than public image URLs.','lock',C.purple],['Data & account controls','Separate data reset and account deletion. Both require password verification and a typed confirmation.','shield',C.peach],['Transport & caching','HTTPS in production. Private responses use no-store; service-worker caches contain public library assets.','sync',C.pale]]
    specs.forEach((v,i)=>card(s,{x:.65+(i%2)*6.13,y:2.45+Math.floor(i/2)*1.92,w:5.88,h:1.68,title:v[0],body:v[1],fill:v[3]}))
    footer(s,8,'Security is a design and testing responsibility; no certification or blanket compliance claim.')
    note(s,'Security: data ownership, photos and user control','RLS is the database ownership layer: a valid login alone does not allow access to another user’s records. Backend APIs derive the user ID from a verified session, not from a browser-supplied owner field. Progress photos are stored privately and are displayed through signed URLs with a short lifetime, currently ten minutes. HTTPS and production security headers protect transport and browser behavior. Personal responses are marked private/no-store, while the service worker caches public exercise and food assets. Settings separates deleting data, which keeps credentials and restarts onboarding, from deleting the account, which removes owned data and signs out. New deletion controls require a server-only service key, migration and live tests. Data resets also invalidate stale data generations so old devices cannot silently repopulate deleted records. These controls support privacy, but do not by themselves establish formal Data Privacy Act compliance. Suggested timing: 50 seconds.', ['backend/migrations/20261107_plan_playlists.sql; backend/migrations/20261110_progress.sql; backend/app/api/progress/route.ts; frontend/next.config.mjs; backend/app/api/account/route.ts; AUTH_SETUP.md.'])
  }
  // 09 — User benefits
  {
    const s=page('Features & user benefits','Less switching. More follow-through.','The interface connects planning, daily actions and the records users choose to keep.')
    const features=[['Personal onboarding','Use goals, availability, equipment and food preferences to shape editable drafts.','user',C.blue],['Plans & playlists','Arrange one day or a week; edit times, portions, sets, rest and exercise order.','plan',C.pale],['Reference libraries','Explore 100 exercises and 100 foods with filters, instructions and portion details.','food',C.peach],['Progress & documentation','Review analytics, measurements, energy, recovery and a private photo timeline.','chart',C.purple],['Motivation & reminders','Log water, get due-task reminders and claim achievements with shareable cards.','check',C.pink],['Community & support','Share questions, find training connections and ask the optional fitness chat.','people',C.blue]]
    features.forEach((v,i)=>{const x=.65+(i%3)*4.08,y=2.43+Math.floor(i/3)*2.08;box(s,x,y,3.86,1.87,v[3]);icon(s,v[2],x+.2,y+.2,C.ink,.29);text(s,v[0],x+.63,y+.18,3.02,.63,18,C.ink,{bold:true});text(s,v[1],x+.21,y+.86,3.43,.76,14,C.gray)})
    footer(s,9,'30 achievements in 5 categories • notification preferences per feature • optional device permission')
    note(s,'Features and practical benefits','Onboarding makes the initial suggestions relevant to the user’s available time, equipment and dietary preferences. Plans and playlists let users customize schedules rather than being locked into a recommendation. The two reference libraries reduce searching across separate sites. Progress combines behavioral, nutrition and workout analytics with measurements, energy and recovery logs and optional private photos. Notifications are grouped, configurable by feature and cleared when their linked task is completed or social activity is viewed. Device alerts require permission and are not a promise of background push delivery while the app is closed. Thirty achievements across five categories provide milestones and shareable cards. Community tools support questions and introductions; availability still depends on authentication and backend setup. These are intended benefits, not measured improvements from completed research. Suggested timing: 45 seconds.', ['README.md; shared/notifications.ts; shared/progress.ts; frontend/components/progress-workspace.tsx; frontend/components/social-workspace.tsx; docs/ai/FEATURES_AND_FLOWS.md.'])
  }
  // 10 — Datasets
  {
    const s=page('Datasets & provenance','Reference-backed content, with clear boundaries.','The app uses curated reference catalogs; these are not datasets used to train a custom AI model.')
    box(s,.65,2.51,5.88,2.64,C.blue,C.blue)
    text(s,'100',.94,2.77,2,.98,55,C.blueInk,{bold:true});text(s,'EXERCISES',3.0,3.05,3.0,.3,16,C.blueInk,{bold:true,charSpacing:1})
    text(s,'ExerciseGymGifsDB supplies demonstration media.\nFitSync authors the guidance, tags and starting targets.',.96,3.88,5.22,1.16,17,C.ink)
    box(s,6.8,2.51,5.88,2.64,C.peach,C.peach)
    text(s,'100',7.1,2.77,2,.98,55,C.brown,{bold:true});text(s,'FOODS',9.2,3.05,3.0,.3,16,C.brown,{bold:true,charSpacing:1})
    text(s,'USDA FoodData Central SR Legacy values.\nNutrients and source-backed gram portions are retained.',7.1,3.88,5.22,1.16,17,C.ink)
    box(s,.65,5.52,12.03,.98,C.ink,C.ink)
    text(s,'Trust checks',.95,5.76,2.0,.3,20,C.yellow,{bold:true})
    text(s,'Raw/cooked states stay distinct • portions scale from 100 g • MET estimates use activity classes',3.08,5.73,9.19,.54,15,C.white)
    footer(s,10,'Sources: ExerciseGymGifsDB • USDA SR Legacy (04/2018) • Compendium of Physical Activities')
    note(s,'Datasets and how trust is supported','The current catalogs contain exactly 100 curated exercises and 100 generic foods, rather than the proposed fifty-per-library baseline in the manuscript. Exercise demonstrations and thumbnails come from ExerciseGymGifsDB at the pinned source revision recorded in backend/data/README.md. FitSync’s instructions, tags and planning targets are separately authored. Food nutrient values and household gram weights come from USDA FoodData Central SR Legacy, April 2018, with provenance preserved in foods-source.json. Values are stored on a 100-gram edible-weight basis, and preparation states remain distinct. The Physical Activity Compendium supports broad MET activity-class estimates in exercise details. These references support traceability, not a guarantee that an individual’s exact meal composition, allergies or energy expenditure is measured accurately. We did not train a custom AI model on these catalogs. Suggested timing: 50 seconds.', ['backend/data/README.md; backend/data/foods-source.json; NUTRITION_LIBRARY.md; scripts/exercise-estimates.mjs; https://github.com/JahelCuadrado/ExerciseGymGifsDB; https://fdc.nal.usda.gov/download-datasets/; https://pacompendium.com/adult-compendium/'])
  }
  // 11 — Calculation
  {
    const s=page('How formulation works','Show the calculation. Keep the user in control.','The current planner uses explicit filters, scheduling rules and transparent estimates.')
    box(s,.65,2.43,5.88,2.08,C.blue,C.blue)
    text(s,'Workout draft',.94,2.71,5.2,.43,23,C.ink,{bold:true})
    text(s,'Preferences → eligible exercises → time budget\n→ sets, repetitions, rest and start times',.94,3.33,5.2,.9,17,C.blueInk,{bold:true})
    box(s,6.8,2.43,5.88,2.08,C.peach,C.peach)
    text(s,'Food portions',7.1,2.71,5.2,.43,23,C.ink,{bold:true})
    text(s,'Nutrient amount = per-100 g value × grams ÷ 100',7.1,3.29,5.15,.57,18,C.brown,{bold:true})
    text(s,'Example: 150 g cooked white rice ≈ 195 kcal.',7.1,4.0,5.2,.25,15,C.gray)
    box(s,.65,4.88,12.03,1.42,C.pale,C.pale)
    text(s,'Daily energy & macro estimates',.95,5.15,4.22,.85,23,C.ink,{bold:true})
    text(s,'Mifflin–St Jeor range × activity × goal factor.\nProtein / carbohydrate: 4 kcal per g. Fat: 9 kcal per g.',5.5,5.14,6.78,.66,17,C.brown)
    footer(s,11,'Estimates, not prescriptions. Marking a task done records estimated duration, not measured exercise time.')
    note(s,'Formulation and transparent calculations','Workout generation filters the exercise catalog by equipment, experience, focus and movement constraints. It then fits normal set, repetition, rest and preparation blocks into the chosen session budget and sequences times from the preferred start time. It does not adapt prescriptions automatically from RPE in the current implementation. Food nutrients use the formula: source nutrient per 100 grams multiplied by the selected grams divided by 100. Cooked white rice has 130 kcal per 100 grams in the current source record; 150 grams gives 195 kcal. For adult daily energy, the code computes base = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years), then applies both published coefficients (−161 and +5), activity multipliers and a goal factor. It shows a range rather than inferring biological sex from gender identity. Fat-loss and muscle-gain factors are 0.9 and 1.1, within app guardrails; these are implementation choices, not medically validated recommendations. Macros are planning allocations: 20% protein, or 25% for muscle/strength goals, 30% fat and the remainder carbohydrate. Adult calorie targeting is not applied under 18, and some profiles are deferred for professional review. Meal drafts may not exactly reach calculated targets. Exercise-detail calories use MET × 3.5 × weight(kg) / 200 × minutes, calculated separately for work and rest; they are broad gross estimates, not wearable measurements or the food target. Suggested timing: 65 seconds.', ['shared/daily-plans.ts: planTargets, taskMinutes, foodTotals, eligibleExercises and formulateDay; scripts/exercise-estimates.mjs; MY_PLAN_SETUP.md; backend/data/foods.json; Mifflin et al. 1990, American Journal of Clinical Nutrition, doi:10.1093/ajcn/51.2.241.'])
  }
  // 12 — Demo (final slide)
  {
    const s=page('Live app demonstration','Let’s follow one day in FitSync.','We will show the user workflow first, then invite your technical observations.')
    box(s,.65,2.5,3.72,3.97,C.ink,C.ink)
    s.addImage({path:path.join(ASSETS,'greeting.png'),...contain(path.join(ASSETS,'greeting.png'),.94,2.7,3.13,2.55)})
    text(s,'Open the prototype',.97,5.55,3.08,.35,22,C.yellow,{bold:true,align:'center',hyperlink:{url:'https://fitsync-app-features.vercel.app'}})
    text(s,'fitsync-app-features.vercel.app',.94,6.1,3.13,.21,11,C.white,{align:'center',hyperlink:{url:'https://fitsync-app-features.vercel.app'}})
    const steps=[['01','Home','Read today’s summaries.'],['02','Workout','Generate, edit and complete a task.'],['03','Nutrition','Choose a food and adjust its portion.'],['04','Progress','Check analytics and record history.'],['05','Community','Browse a section and its filters.'],['06','Settings','Review privacy, reminders and access.']]
    steps.forEach((v,i)=>{const x=4.75+(i%2)*4.07,y=2.5+Math.floor(i/2)*1.38;box(s,x,y,3.85,1.16,i===1?C.pale:C.white);text(s,v[0],x+.2,y+.2,.45,.22,13,C.brown,{bold:true});text(s,v[1],x+.83,y+.18,2.8,.37,20,C.ink,{bold:true});text(s,v[2],x+.21,y+.7,3.43,.29,13,C.gray)})
    footer(s,12,'Use a prepared test account. Show only features available in the selected local or hosted build.')
    note(s,'Live app demo — final part','Switch to the app. Use a prepared test account with nonsensitive sample records. First show Home and the daily summaries. In Plans, demonstrate a selected day, an editable workout draft, a library detail and completion. Switch to Nutrition and show a gram-backed food portion and planned versus completed nutrients. Open Progress for Analytics, Documentation and an achievement, then briefly show a Community filter and Settings. Do not perform real account deletion during the presentation. Only demonstrate the new authentication controls in a local or hosted build where the migration and keys have been configured and tested. If the hosted build has older code, explain this before showing the feature rather than claiming it is live. The computer-vision meal parser, native app-store release and automatic RPE-based LLM recalibration described in the manuscript are not part of this working demo. Invite the approved expert evaluation after the demonstration. Suggested demo length: 4–5 minutes.', ['Live prototype: https://fitsync-app-features.vercel.app; local app: http://localhost:3000; AUTH_SETUP.md; manuscript proposed scope and current repository implementation.'])
  }
  // Ensure all non-cover slides carry their intended footer numbering.
  const target=path.join(OUT,'FitSync_KEYSTOKES_IT_Expert_Presentation.pptx')
  await ppt.writeFile({fileName:target,compression:true})
  fs.writeFileSync(path.join(OUT,'slides-and-notes.json'),JSON.stringify(notes,null,2))
  let guide='# FitSync — presenter notes\n\n12 slides; approximately 8–9 minutes of explanation plus a 4–5 minute live demonstration.\n\n'
  for(const n of notes)guide+='## '+String(n.n).padStart(2,'0')+' — '+n.title+'\n\n'+n.body+'\n\n**Sources and evidence**\n\n'+n.sources.map(v=>'- '+v).join('\n')+'\n\n'
  guide+='## Important manuscript alignment checks\n\nThe supplied PDF contains 31 PDF pages and Chapters I–III, despite its filename. Page references above refer to PDF page numbers, not the printed chapter page numbers.\n\n| Manuscript proposal | Current prototype / presentation wording |\n| --- | --- |\n| React Native, Android/iOS and Play Store distribution | Responsive Next.js web prototype |\n| Generative adaptive workout engine using feedback | Explicit rule-based daily planner; editable schedules |\n| Food-photo computer vision and automatic macros | USDA-backed manual food/portion logging; private progress photos are not a food-recognition model |\n| 50 exercises and 50 food profiles | Actual checked-in catalogs contain 100 exercises and 100 foods |\n| Educational mini-games and unlockable library records | Achievements and reference libraries are implemented; do not promise mini-games in this demo |\n| MS Word exports | Current record history exports CSV; do not claim Word export |\n| No recurring cloud jobs | Social cleanup has a separate protected cleanup endpoint and deployment configuration; do not claim there are no server cleanup tasks |\n| IT experts validate instruments; local users provide survey responses | User brief requests IT-expert respondents; confirm that role against the adviser-approved research instrument |\n\n## Before presenting\n\n- Confirm name spellings and the exact group spelling KEYSTOKES.\n- Decide whether to demonstrate localhost or the hosted version; they may not contain the same updates.\n- Complete migrations and secret configuration before showing new signup/recovery/deletion controls.\n- Use a disposable account, nonsensitive sample photos and prepared plan history. Do not show environment files or credentials.\n- Test internet, OAuth redirects and SMTP delivery. Keep a screenshot/video backup.\n- The app is decision support, not a clinical diagnosis, prescription or guarantee of results.\n- Do not claim ISO certification, completed respondent results, regulatory compliance or a custom-trained AI model.\n'
  fs.writeFileSync(path.join(OUT,'Presenter_Notes_and_Manuscript_Checks.md'),guide)
  console.log('Created '+target+' ('+ppt._slides.length+' slides)')
}
main().catch(e=>{console.error(e);process.exit(1)})
