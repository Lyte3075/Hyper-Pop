const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin"
};
const CLAIM_HASH = "54568e56559df86370e00979a2a14a1873765e4fb505b37546c70ed1e0d154d8";
const MAX_FILE_BYTES = 262144;
function reply(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
function credentials() {
  const url = Deno.env.get("SUPABASE_URL") || "";
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!key) {
    try { const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}"); key = keys.default || Object.values(keys)[0] || ""; } catch {}
  }
  if (!url || !key) throw new Error("Storage service is not configured.");
  const headers: Record<string,string> = { apikey:key, "Content-Type":"application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
  return { url, headers };
}
async function verifySession(token: string) {
  const url = Deno.env.get("SUPABASE_URL") || "";
  let key = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!key) {
    try { const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}"); key = keys.default || Object.values(keys)[0] || ""; } catch {}
  }
  if (!url || !key) throw new Error("Hyper-Pop account verification is unavailable.");
  const headers: Record<string,string> = { apikey:key, "Content-Type":"application/json" };
  if (!key.startsWith("sb_publishable_")) headers.Authorization = "Bearer " + key;
  const res = await fetch(url + "/rest/v1/rpc/hyperpop_me", { method:"POST", headers, body:JSON.stringify({p_token:token}), signal:AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error("Could not verify the Hyper-Pop session.");
  const data = await res.json();
  if (!data?.ok || !data?.id) return null;
  return { id:String(data.id), username:String(data.username || "") };
}
async function db(path: string, init: RequestInit = {}) {
  const {url,headers} = credentials();
  const res = await fetch(url + "/rest/v1/" + path, { ...init, headers:{...headers,...(init.headers || {})}, signal:AbortSignal.timeout(7000) });
  const raw = await res.text();
  let data: any = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!res.ok) throw new Error("Persistent project storage request failed (" + res.status + ").");
  return data;
}
function safeSlug(v: unknown) {
  const slug = String(v || "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) throw new Error("Project names must use lowercase letters, numbers, and hyphens.");
  return slug;
}
function safePath(v: unknown) {
  const p = String(v || "").replace(/^\.\//,"");
  if (!p || p.length > 512 || p.startsWith("/") || p.includes("\\") || p.split("/").some(x => !x || x === "." || x === "..") || /[\u0000-\u001f]/.test(p)) throw new Error("Invalid project file path.");
  return p;
}
async function ownedProject(userId: string, slug: string) {
  const rows = await db("hyperpop_node_projects?select=id,slug,name&owner_user_id=eq." + encodeURIComponent(userId) + "&slug=eq." + encodeURIComponent(slug) + "&limit=1");
  return rows?.[0] || null;
}
async function handle(user: {id:string}, input: any) {
  const action = String(input?.action || "");
  if (action === "claim") {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(input?.claimKey || "")));
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,"0")).join("");
    if (hash !== CLAIM_HASH) return reply({ok:false,error:"The one-time setup key is incorrect."},403);
    const current = await db("hyperpop_node_owner?select=owner_user_id&singleton=eq.true");
    if (current?.length) {
      return current[0].owner_user_id === user.id
        ? reply({ok:true,claimed:true,alreadyOwner:true})
        : reply({ok:false,error:"This personal Node server has already been claimed."},409);
    }
    const inserted = await db("hyperpop_node_owner", {method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({singleton:true,owner_user_id:user.id})});
    return reply({ok:true,claimed:true,owner:inserted?.[0]?.owner_user_id === user.id});
  }
  const owner = await db("hyperpop_node_owner?select=owner_user_id&singleton=eq.true");
  if (!owner?.length) return reply({ok:false,error:"This server has not been claimed yet. Run the one-time setup command first."},423);
  if (owner[0].owner_user_id !== user.id) return reply({ok:false,error:"This is a personal server and is linked to a different Hyper-Pop account."},403);

  if (action === "list-projects") {
    const projects = await db("hyperpop_node_projects?select=id,slug,name,created_at,updated_at&owner_user_id=eq." + encodeURIComponent(user.id) + "&order=created_at.asc");
    return reply({ok:true,projects});
  }
  if (action === "create-project") {
    const slug = safeSlug(input.slug);
    const name = String(input.name || slug).slice(0,80);
    const existing = await db("hyperpop_node_projects?select=id&owner_user_id=eq." + encodeURIComponent(user.id));
    if (existing.length >= 10) return reply({ok:false,error:"The personal server supports up to 10 projects."},429);
    const rows = await db("hyperpop_node_projects", {method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({owner_user_id:user.id,slug,name})});
    return reply({ok:true,project:rows?.[0]});
  }
  if (action === "delete-project") {
    const slug = safeSlug(input.slug);
    const project = await ownedProject(user.id,slug);
    if (!project) return reply({ok:false,error:"Project not found."},404);
    await db("hyperpop_node_projects?id=eq." + encodeURIComponent(project.id) + "&owner_user_id=eq." + encodeURIComponent(user.id),{method:"DELETE"});
    return reply({ok:true,deleted:slug});
  }
  const slug = safeSlug(input.slug);
  const project = await ownedProject(user.id,slug);
  if (!project) return reply({ok:false,error:"Project not found."},404);
  if (action === "list-files") {
    const files = await db("hyperpop_node_files?select=path,updated_at&project_id=eq." + encodeURIComponent(project.id) + "&owner_user_id=eq." + encodeURIComponent(user.id) + "&order=path.asc");
    return reply({ok:true,files});
  }
  if (action === "get-file") {
    const path = safePath(input.path);
    const rows = await db("hyperpop_node_files?select=path,content,updated_at&project_id=eq." + encodeURIComponent(project.id) + "&owner_user_id=eq." + encodeURIComponent(user.id) + "&path=eq." + encodeURIComponent(path) + "&limit=1");
    return rows.length ? reply({ok:true,file:rows[0]}) : reply({ok:false,error:"File not found."},404);
  }
  if (action === "put-file") {
    const path = safePath(input.path);
    const content = String(input.content ?? "");
    if (new TextEncoder().encode(content).byteLength > MAX_FILE_BYTES) return reply({ok:false,error:"Each project file is limited to 256 KB."},413);
    const exists = await db("hyperpop_node_files?select=path&project_id=eq." + encodeURIComponent(project.id) + "&path=eq." + encodeURIComponent(path) + "&limit=1");
    if (!exists.length) {
      const count = await db("hyperpop_node_files?select=path&project_id=eq." + encodeURIComponent(project.id));
      if (count.length >= 100) return reply({ok:false,error:"Each project can contain up to 100 files."},429);
    }
    await db("hyperpop_node_files",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({project_id:project.id,owner_user_id:user.id,path,content,updated_at:new Date().toISOString()})});
    return reply({ok:true,path});
  }
  if (action === "delete-file") {
    const path = safePath(input.path);
    await db("hyperpop_node_files?project_id=eq." + encodeURIComponent(project.id) + "&owner_user_id=eq." + encodeURIComponent(user.id) + "&path=eq." + encodeURIComponent(path),{method:"DELETE"});
    return reply({ok:true,path});
  }
  return reply({ok:false,error:"Unknown storage action."},400);
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
  if (req.method !== "POST") return reply({ok:false,error:"POST is required."},405);
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (!match) return reply({ok:false,error:"Sign in with Hyper-Pop to use this server."},401);
    const user = await verifySession(match[1]);
    if (!user) return reply({ok:false,error:"Your Hyper-Pop session is invalid or expired."},401);
    const text = await req.text();
    if (text.length > 300000) return reply({ok:false,error:"Request is too large."},413);
    const input = JSON.parse(text || "{}");
    return await handle(user,input);
  } catch (error) {
    return reply({ok:false,error:error instanceof Error ? error.message : "Persistent storage request failed."},500);
  }
});