import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"https://hyper-pop.pntr.dev","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(v:unknown,s=200)=>new Response(JSON.stringify(v),{status:s,headers:cors});
const url=Deno.env.get("SUPABASE_URL")!,key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(url,key,{auth:{persistSession:false}});
let statsCache:{key:string;at:number;value:unknown}|null=null;
async function probe(name:string,target:string,method="OPTIONS"){const t=Date.now();try{const r=await fetch(target,{method,signal:AbortSignal.timeout(4500)});return{name,status:r.ok?"operational":r.status<500?"degraded":"down",latency_ms:Date.now()-t}}catch{return{name,status:"down",latency_ms:null}}}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({ok:false},405);
 try{
  const b=await req.json(),action=String(b.action||"");
  if(action==="visit"||action==="heartbeat"){
   const visitor=String(b.visitor_id||"").slice(0,80),session=String(b.session_id||"").slice(0,80);
   if(!visitor||!session)return reply({ok:false,error:"Missing session identifiers"},400);
   let account:string|null=null;
   // Only resolve account tokens on page visits. Heartbeats preserve the existing account_id.
   if(action==="visit"){const token=typeof b.token==="string"?b.token:"";if(token){const {data}=await db.from("hyperpop_sessions").select("account_id").eq("token",token).gt("expires_at",new Date().toISOString()).maybeSingle();account=data?.account_id||null}}
   const sessionRow:Record<string,unknown>={session_id:session,visitor_id:visitor,page_path:String(b.page_path||"/").slice(0,240),last_seen_at:new Date().toISOString()};
   if(action==="visit")sessionRow.account_id=account;
   const {error}=await db.from("hyperpop_site_sessions").upsert(sessionRow,{onConflict:"session_id"});
   if(error)throw error;
   if(action==="visit"){const {error:e}=await db.from("hyperpop_site_visits").insert({visitor_id:visitor,page_path:String(b.page_path||"/").slice(0,240)});if(e)throw e}
   return reply({ok:true});
  }
  if(action!=="stats")return reply({ok:false,error:"Unknown action"},400);
  const now=new Date(),rangeDays=Math.min(365,Math.max(7,Number(b.range_days)||14)),timezoneOffset=Math.max(-840,Math.min(840,Number(b.timezone_offset)||0));
  const cacheKey=rangeDays+":"+timezoneOffset;
  if(statsCache&&statsCache.key===cacheKey&&Date.now()-statsCache.at<60000)return reply(statsCache.value);
  const localNow=new Date(now.getTime()-timezoneOffset*60000),since=new Date(now.getTime()-12*60*1000).toISOString(),localStart=new Date(localNow);localStart.setUTCHours(0,0,0,0);const chartSince=new Date(localStart.getTime()-(rangeDays-1)*86400000+timezoneOffset*60000).toISOString(),uptimeSince=new Date(now.getTime()-86400000).toISOString();
  const [accounts,visits,sessions,presence,website,voice,push]=await Promise.all([
   db.from("hyperpop_accounts").select("id",{count:"exact",head:true}),
   db.from("hyperpop_site_visits").select("id",{count:"exact",head:true}),
   db.from("hyperpop_site_sessions").select("session_id",{count:"exact",head:true}).gt("last_seen_at",since),
   db.from("hyperpop_user_presence").select("account_id").gt("last_seen_at",since).neq("status","invisible"),
   probe("Website","https://hyper-pop.pntr.dev/","HEAD"),
   probe("Voice calling",url+"/functions/v1/hyperpop-voice"),
   probe("Push notifications",url+"/functions/v1/hyperpop-push")
  ]);
  if([accounts,visits,sessions,presence].some(x=>x.error))throw new Error("Stats query failed");
  // PostgREST can cap responses at 1,000 rows even when a larger limit is requested.
  // Page through the selected date window so high-traffic days are counted completely.
  const chartRows:{visited_at:string;visitor_id:string|null}[]=[];
  const pageSize=1000;
  for(let offset=0;;offset+=pageSize){
   const {data,error}=await db.from("hyperpop_site_visits").select("visited_at,visitor_id").gte("visited_at",chartSince).order("visited_at",{ascending:true}).range(offset,offset+pageSize-1);
   if(error)throw error;
   const batch=data||[];
   chartRows.push(...batch);
   if(batch.length<pageSize)break;
  }
  const services=[website,{name:"Social & messaging",status:"operational",latency_ms:null},{name:"Supabase database",status:"operational",latency_ms:null},voice,push,{name:"Realtime presence",status:"operational",latency_ms:null}];
  const {data:oldHistory}=await db.from("hyperpop_service_status_history").select("service_name,status,checked_at").order("checked_at",{ascending:false}).limit(100);
  for(const s of services){
   const old=(oldHistory||[]).find(x=>x.service_name===s.name);
   if(!old||old.status!==s.status)await db.from("hyperpop_service_status_history").insert({service_name:s.name,status:s.status});
   await db.from("hyperpop_service_health_checks").insert({service_name:s.name,status:s.status});
  }
  const incidents=(oldHistory||[]).filter(x=>x.status!=="operational"||(oldHistory||[]).some(y=>y.service_name===x.service_name&&y.status!=="operational"&&new Date(y.checked_at)<new Date(x.checked_at))).map(x=>({service:x.service_name,status:x.status,at:x.checked_at}));
  const {data:checks}=await db.from("hyperpop_service_health_checks").select("service_name,status").gte("checked_at",uptimeSince).limit(20000);
  const uptimeByService=new Map<string,{total:number;operational:number}>();
  for(const row of checks||[]){const item=uptimeByService.get(row.service_name)||{total:0,operational:0};item.total++;if(row.status==="operational")item.operational++;uptimeByService.set(row.service_name,item)}
  for(const s of services){const item=uptimeByService.get(s.name);s.uptime_pct=item?.total?Math.round(item.operational/item.total*10000)/100:100}
  const snapshotInsert=await db.from("hyperpop_stats_snapshots").insert({active_users:new Set((presence.data||[]).map(x=>x.account_id)).size,active_sessions:sessions.count||0,accounts:accounts.count||0,visits:visits.count||0});
  if(snapshotInsert.error)throw snapshotInsert.error;
  const {data:snapshotRows,error:snapshotError}=await db.from("hyperpop_stats_snapshots").select("captured_at,active_users,active_sessions,accounts,visits").gte("captured_at",chartSince).order("captured_at",{ascending:true}).limit(20000);
  if(snapshotError)throw snapshotError;
  const days:Record<string,number>={},unique:Record<string,Set<string>>={},snapshots:Record<string,{date:string,active_users:number,active_sessions:number,accounts:number,visits:number}>={};
  for(let i=0;i<rangeDays;i++){const d=new Date(localNow.getTime()-i*86400000),k=d.toISOString().slice(0,10);days[k]=0;unique[k]=new Set();snapshots[k]={date:k,active_users:0,active_sessions:0,accounts:0,visits:0}}
  for(const row of snapshotRows||[]){const k=new Date(new Date(row.captured_at).getTime()-timezoneOffset*60000).toISOString().slice(0,10);if(k in snapshots)snapshots[k]={date:k,active_users:row.active_users,active_sessions:row.active_sessions,accounts:row.accounts,visits:row.visits}}
  for(const v of chartRows){const k=new Date(new Date(v.visited_at).getTime()-timezoneOffset*60000).toISOString().slice(0,10);if(k in days){days[k]++;if(v.visitor_id)unique[k].add(v.visitor_id)}}
  const payload={ok:true,updated_at:now.toISOString(),stats:{active_users:new Set((presence.data||[]).map(x=>x.account_id)).size,active_sessions:sessions.count||0,accounts:accounts.count||0,visits:visits.count||0},today:localNow.toISOString().slice(0,10),visits_by_day:Object.entries(days).map(([date,count])=>({date,count})),unique_visitors_by_day:Object.entries(unique).map(([date,ids])=>({date,count:ids.size})),snapshots_by_day:Object.values(snapshots),services,incidents};
  statsCache={key:cacheKey,at:Date.now(),value:payload};
  return reply(payload);
 }catch(e){console.error(e);return reply({ok:false,error:"Stats are temporarily unavailable"},500)}
});