import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const uuid=(v:unknown)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({ok:false,error:"POST required."},405);
 try{
  const body=await req.json(),token=String(body?.token||"");
  if(!uuid(token))return json({ok:false,error:"Sign in to manage push notifications."},401);
  const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey)return json({ok:false,error:"Push service is not configured."},500);
  const db=createClient(url,serviceKey,{auth:{persistSession:false}});
  const {data:session}=await db.from("hyperpop_sessions").select("account_id").eq("token",token).gt("expires_at",new Date().toISOString()).maybeSingle();
  if(!session?.account_id)return json({ok:false,error:"Your session expired. Please sign in again."},401);
  const me=session.account_id,action=String(body?.action||"");
  if(action==="subscribe"){
   const sub=body?.subscription,endpoint=sub?.endpoint,keys=sub?.keys;
   if(typeof endpoint!=="string"||!endpoint.startsWith("https://")||typeof keys?.p256dh!=="string"||typeof keys?.auth!=="string")return json({ok:false,error:"Invalid push subscription."},400);
   const {error}=await db.from("hyperpop_push_subscriptions").upsert({account_id:me,endpoint,p256dh:keys.p256dh,auth:keys.auth,updated_at:new Date().toISOString()},{onConflict:"endpoint"});
   if(error)throw error;return json({ok:true});
  }
  if(action==="unsubscribe"){
   const endpoint=body?.endpoint;
   if(typeof endpoint!=="string")return json({ok:false,error:"Invalid endpoint."},400);
   const {error}=await db.from("hyperpop_push_subscriptions").delete().eq("account_id",me).eq("endpoint",endpoint);
   if(error)throw error;return json({ok:true});
  }
  let recipients:string[]=[],title="Hyper-Pop",message="You have a new notification.",targetUrl="/";
  const {data:account}=await db.from("hyperpop_accounts").select("username").eq("id",me).maybeSingle();
  const username=account?.username||"Someone";
  if(action==="notify_message"){
   const conversationId=body?.conversation_id;if(!uuid(conversationId))return json({ok:false,error:"Invalid conversation."},400);
   const {data:members,error}=await db.from("hyperpop_conversation_members").select("account_id").eq("conversation_id",conversationId);
   if(error)throw error;
   if(!(members||[]).some((m:any)=>m.account_id===me))return json({ok:false,error:"Not a member of this conversation."},403);
   recipients=(members||[]).map((m:any)=>m.account_id).filter((id:string)=>id!==me);
   title="@"+username+" sent you a message";
   message="Open Hyper-Pop to read your new message.";
   targetUrl="/?hp-chat="+encodeURIComponent(conversationId);
  }else if(action==="notify_call"){
   const callId=body?.call_id;if(!uuid(callId))return json({ok:false,error:"Invalid call."},400);
   const {data:call,error}=await db.from("hyperpop_voice_calls").select("id,caller_id,callee_id,status").eq("id",callId).eq("caller_id",me).eq("status","ringing").maybeSingle();
   if(error)throw error;if(!call)return json({ok:false,error:"Call is no longer ringing."},404);
   recipients=[call.callee_id];title="Incoming Hyper-Pop voice call";message="@"+username+" is calling you.";targetUrl="/?hp-call="+encodeURIComponent(callId);
  }else return json({ok:false,error:"Unknown push action."},400);

  const publicKey=Deno.env.get("VAPID_PUBLIC_KEY")||"",privateKey=Deno.env.get("VAPID_PRIVATE_KEY")||"",subject=Deno.env.get("VAPID_SUBJECT")||"mailto:admin@hyper-pop.pntr.dev";
  if(!publicKey||!privateKey)return json({ok:false,error:"Push keys are not configured yet."},503);
  webpush.setVapidDetails(subject,publicKey,privateKey);
  let sent=0;
  for(const recipient of recipients){
   const {data:presence}=await db.from("hyperpop_user_presence").select("status").eq("account_id",recipient).maybeSingle();
   if(presence?.status==="dnd")continue;
   const {data:subs,error}=await db.from("hyperpop_push_subscriptions").select("id,endpoint,p256dh,auth").eq("account_id",recipient);
   if(error)throw error;
   for(const sub of subs||[]){
    try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title,body:message,url:targetUrl,tag:action==="notify_call"?"hp-call":"hp-message"}),{TTL:60,urgency:action==="notify_call"?"high":"normal"});sent++}
    catch(err){const code=(err as any)?.statusCode;if(code===404||code===410)await db.from("hyperpop_push_subscriptions").delete().eq("id",sub.id);else console.warn("[Hyper-Pop push] Delivery failed:",code||"unknown")}
   }
  }
  return json({ok:true,sent});
 }catch(error){console.error("[Hyper-Pop push]",error);return json({ok:false,error:"The push notification service could not complete that request."},500)}
});
