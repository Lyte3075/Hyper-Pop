import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return reply({ok:false,error:"POST required."},405);
 if(!url||!key)return reply({ok:false,error:"Announcement service is not configured."},500);
 let body:Record<string,unknown>;try{body=await req.json()}catch{return reply({ok:false,error:"Invalid request."},400)}
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}}),action=String(body.action||"");
 if(action==="list"){
  const now=new Date().toISOString();
  const {data:rows,error}=await db.from("hyperpop_announcements").select("id,author_account_id,title,body,show_at,end_at,created_at").lte("show_at",now).or(`end_at.is.null,end_at.gt.${now}`).order("show_at",{ascending:false}).limit(20);
  if(error){console.error("[announcements] list",error.message);return reply({ok:false,error:"Announcements are temporarily unavailable."},500)}
  const ids=[...new Set((rows||[]).map(x=>x.author_account_id))];
  const {data:accounts}=ids.length?await db.from("hyperpop_accounts").select("id,username,display_name").in("id",ids):{data:[]};
  const authors=new Map((accounts||[]).map(x=>[x.id,x]));
  return reply({ok:true,announcements:(rows||[]).map(row=>{const author=authors.get(row.author_account_id);return{id:row.id,title:row.title,text:row.body,author:author?.display_name||author?.username||"Hyper-Pop",username:author?.username||null,show_at:row.show_at,end_at:row.end_at,created_at:row.created_at}})});
 }
 const token=typeof body.token==="string"?body.token:"";
 if(!token||token.length>200)return reply({ok:false,error:"Sign in with an administrator account."},401);
 const {data:session,error:sessionError}=await db.from("hyperpop_sessions").select("account_id").eq("token",token).gt("expires_at",new Date().toISOString()).maybeSingle();
 if(sessionError||!session?.account_id)return reply({ok:false,error:"Your session has expired. Please sign in again."},401);
 const {data:admin,error:adminError}=await db.from("hyperpop_sentinel_admins").select("account_id").eq("account_id",session.account_id).maybeSingle();
 if(adminError||!admin)return reply({ok:false,error:"Administrator permission required."},403);
 if(action==="admin-list"){
  const {data,error}=await db.from("hyperpop_announcements").select("id,title,body,show_at,end_at,created_at").order("created_at",{ascending:false}).limit(100);
  if(error)return reply({ok:false,error:"Could not load announcements."},500);
  return reply({ok:true,announcements:data||[]});
 }
 if(action==="create"){
  const title=typeof body.title==="string"?body.title.trim():"",text=typeof body.text==="string"?body.text.trim():"",startValue=typeof body.show_at==="string"?body.show_at:"",endValue=typeof body.end_at==="string"?body.end_at:"",showAt=new Date(startValue),endAt=new Date(endValue);
  if(!title||title.length>120)return reply({ok:false,error:"Title must be between 1 and 120 characters."},400);
  if(!text||text.length>5000)return reply({ok:false,error:"Announcement text must be between 1 and 5,000 characters."},400);
  if(!startValue||!Number.isFinite(showAt.getTime()))return reply({ok:false,error:"Choose a valid display date and time."},400);
  if(!endValue||!Number.isFinite(endAt.getTime())||endAt<=showAt)return reply({ok:false,error:"Choose an end date and time later than the display date."},400);
  const {data,error}=await db.from("hyperpop_announcements").insert({author_account_id:session.account_id,title,body:text,show_at:showAt.toISOString(),end_at:endAt.toISOString()}).select("id,title,body,show_at,end_at,created_at").single();
  if(error){console.error("[announcements] create",error.message);return reply({ok:false,error:"Could not publish the announcement."},500)}
  return reply({ok:true,announcement:data});
 }
 return reply({ok:false,error:"Unknown announcement action."},400);
});