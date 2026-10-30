import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: cors });
const uuid = (v: unknown) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok:false, error:"POST required." }, 405);
  try {
    const body = await req.json();
    const token = String(body?.token || "");
    if (!uuid(token)) return json({ok:false,error:"Sign in to use voice calls."},401);
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ok:false,error:"Voice calling is not configured yet."},500);
    const db = createClient(url,key,{auth:{persistSession:false}});
    const {data:session} = await db.from("hyperpop_sessions").select("account_id").eq("token",token).gt("expires_at",new Date().toISOString()).maybeSingle();
    if (!session?.account_id) return json({ok:false,error:"Your session expired. Please sign in again."},401);
    const me = session.account_id, action = String(body?.action || ""), callId = body?.call_id;
    const getCall = async () => {
      if (!uuid(callId)) return null;
      const {data} = await db.from("hyperpop_voice_calls").select("*").eq("id",callId).or("caller_id.eq."+me+",callee_id.eq."+me).maybeSingle();
      return data || null;
    };
    if (action === "inbox") {
      const {data,error} = await db.from("hyperpop_voice_calls").select("id,caller_id,callee_id,status,created_at,expires_at").eq("callee_id",me).eq("status","ringing").gt("expires_at",new Date().toISOString()).order("created_at",{ascending:false}).limit(3);
      if(error) throw error;
      return json({ok:true,calls:data||[]});
    }
    if (action === "start") {
      const target = body?.to;
      if (!uuid(target) || target === me) return json({ok:false,error:"Choose a valid friend."},400);
      const [{data:friend},{data:blocked},{data:existing}] = await Promise.all([
        db.from("hyperpop_friendships").select("id").eq("status","accepted").or("and(requester_id.eq."+me+",addressee_id.eq."+target+"),and(requester_id.eq."+target+",addressee_id.eq."+me+")").maybeSingle(),
        db.from("hyperpop_user_blocks").select("blocker_id").or("and(blocker_id.eq."+me+",blocked_id.eq."+target+"),and(blocker_id.eq."+target+",blocked_id.eq."+me+")").limit(1),
        db.from("hyperpop_voice_calls").select("id").in("status",["ringing","active"]).or("and(caller_id.eq."+me+",callee_id.eq."+target+"),and(caller_id.eq."+target+",callee_id.eq."+me+")").gt("expires_at",new Date().toISOString()).limit(1)
      ]);
      if(!friend || (blocked||[]).length) return json({ok:false,error:"Voice calls are only available between friends who have not blocked each other."},403);
      if((existing||[]).length) return json({ok:false,error:"A call with this friend is already in progress."},409);
      const {data,error}=await db.from("hyperpop_voice_calls").insert({caller_id:me,callee_id:target}).select("id,status,created_at,expires_at").single();
      if(error) throw error;
      return json({ok:true,call:data});
    }
    const call = await getCall();
    if(!call) return json({ok:false,error:"Call not found."},404);
    const caller = call.caller_id === me, callee = call.callee_id === me;
    if (action === "poll") {
      if(call.status==="ringing" && new Date(call.expires_at).getTime()<Date.now()) {
        await db.from("hyperpop_voice_calls").update({status:"missed",ended_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",call.id).eq("status","ringing");
        call.status="missed";
      }
      return json({ok:true,call:{id:call.id,caller_id:call.caller_id,callee_id:call.callee_id,status:call.status,offer:call.offer,answer:call.answer,caller_ice:call.caller_ice,callee_ice:call.callee_ice,created_at:call.created_at,expires_at:call.expires_at}});
    }
    if(action==="accept") {
      if(!callee || call.status!=="ringing") return json({ok:false,error:"This call can no longer be accepted."},409);
      const {error}=await db.from("hyperpop_voice_calls").update({status:"active",expires_at:new Date(Date.now()+15*60*1000).toISOString(),updated_at:new Date().toISOString()}).eq("id",call.id).eq("status","ringing");
      if(error) throw error; return json({ok:true});
    }
    if(action==="decline" || action==="hangup") {
      if(call.status==="ringing" || call.status==="active") {
        const {error}=await db.from("hyperpop_voice_calls").update({status:action==="decline"?"declined":"ended",ended_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",call.id);
        if(error) throw error;
      }
      return json({ok:true});
    }
    if(action==="offer" || action==="answer") {
      const description=body?.description;
      if(!description || typeof description!=="object" || !["offer","answer"].includes(description.type) || typeof description.sdp!=="string" || description.sdp.length>30000) return json({ok:false,error:"Invalid call description."},400);
      if((action==="offer" && (!caller || call.status!=="ringing")) || (action==="answer" && (!callee || call.status!=="active"))) return json({ok:false,error:"Not allowed to send this call description."},403);
      const {error}=await db.from("hyperpop_voice_calls").update({[action]:description,updated_at:new Date().toISOString()}).eq("id",call.id);
      if(error) throw error; return json({ok:true});
    }
    if(action==="ice") {
      const candidate=body?.candidate;
      if(!candidate || typeof candidate!=="object" || JSON.stringify(candidate).length>4000 || !["candidate","sdpMid","sdpMLineIndex","usernameFragment"].every(k=>candidate[k]===undefined || ["string","number"].includes(typeof candidate[k]))) return json({ok:false,error:"Invalid network candidate."},400);
      const column=caller?"caller_ice":"callee_ice", list=Array.isArray(call[column])?call[column]:[];
      if(list.length>=100) return json({ok:false,error:"Too many network candidates."},429);
      const {error}=await db.from("hyperpop_voice_calls").update({[column]:[...list,candidate],updated_at:new Date().toISOString()}).eq("id",call.id);
      if(error) throw error; return json({ok:true});
    }
    return json({ok:false,error:"Unknown voice action."},400);
  } catch(error) {
    console.error("[Hyper-Pop voice]",error);
    return json({ok:false,error:"The voice-call service could not complete that request."},500);
  }
});
