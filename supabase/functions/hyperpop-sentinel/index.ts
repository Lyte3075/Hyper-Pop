import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
const secret = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => {
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default || ""; } catch { return ""; }
})();
const ipOf = (req: Request) => {
  const raw = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  return raw && /^[0-9a-f:.]+$/i.test(raw) ? raw : null;
};
const validDevice = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9-]{36}$/i.test(v);
const durationMs: Record<string, number | null> = {
  "1day": 86400000, "7days": 604800000, "30days": 2592000000, "90days": 7776000000, permanent: null,
};
const cleanInfo = (v: unknown) => {
  const allowed = ["user_agent","platform","vendor","language","languages","timezone","screen_width","screen_height","screen_color_depth","viewport_width","viewport_height","pixel_ratio","hardware_concurrency","device_memory","max_touch_points","touch_supported","cookie_enabled","do_not_track","mobile_hint"];
  const out: Record<string, unknown> = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const k of allowed) { const x = (v as Record<string, unknown>)[k]; if (typeof x === "string") out[k] = x.slice(0,500); else if (typeof x === "number" && Number.isFinite(x)) out[k] = x; else if (typeof x === "boolean" || x === null) out[k] = x; else if (k === "languages" && Array.isArray(x)) out[k] = x.filter(y => typeof y === "string").slice(0,8).map(y => y.slice(0,40)); }
  return out;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "POST required." }, 405);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return reply({ ok: false, error: "Invalid request." }, 400); }
  const url = Deno.env.get("SUPABASE_URL") || "", key = secret();
  if (!url || !key) return reply({ ok: false, error: "Sentinel is not configured." }, 500);
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const token = typeof body.token === "string" ? body.token : "";
  let account: { id: string; username: string } | null = null;
  if (token) {
    const { data: session } = await db.from("hyperpop_sessions").select("account_id").eq("token", token).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (session?.account_id) {
      const { data } = await db.from("hyperpop_accounts").select("id,username").eq("id", session.account_id).maybeSingle();
      account = data;
    }
  }
  const deviceKey = validDevice(body.device_key) ? body.device_key.toLowerCase() : null;
  const ip = ipOf(req);
  let deviceId: string | null = null;
  if (deviceKey) {
    const info = cleanInfo(body.device_info);
    const { data: device } = await db.from("hyperpop_sentinel_devices").upsert({
      device_key: deviceKey, last_seen_at: new Date().toISOString(), last_ip: ip,
      user_agent: String(info.user_agent || req.headers.get("user-agent") || "").slice(0, 500), device_info: info,
    }, { onConflict: "device_key" }).select("id").single();
    deviceId = device?.id || null;
    if (deviceId && account) {
      await db.from("hyperpop_sentinel_device_accounts").upsert({
        device_id: deviceId, account_id: account.id, last_seen_at: new Date().toISOString(),
      }, { onConflict: "device_id,account_id" });
    }
  }
  const action = String(body.action || "check");
  const now = new Date().toISOString();

  if (action === "check") {
    const matches: any[] = [];
    if (account) {
      const { data } = await db.from("hyperpop_sentinel_bans").select("id,scope,reason,duration,expires_at,created_at")
        .eq("account_id", account.id).is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${now}`);
      matches.push(...(data || []));
    }
    if (deviceId) {
      const { data } = await db.from("hyperpop_sentinel_bans").select("id,scope,reason,duration,expires_at,created_at")
        .eq("device_id", deviceId).is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${now}`);
      matches.push(...(data || []));
    }
    if (ip) {
      const { data } = await db.from("hyperpop_sentinel_bans").select("id,scope,reason,duration,expires_at,created_at")
        .eq("network_ip", ip).is("revoked_at", null).or(`expires_at.is.null,expires_at.gt.${now}`);
      matches.push(...(data || []));
    }
    const unique = [...new Map(matches.map(x => [x.id, x])).values()];
    return reply({ ok: true, banned: unique.length > 0, bans: unique, device_id: deviceId });
  }

  if (action === "appeal") {
    const banId = String(body.ban_id || ""), message = String(body.message || "").trim();
    if (!banId || message.length < 10 || message.length > 2000) return reply({ ok: false, error: "Write an appeal of 10-2,000 characters." }, 400);
    const { data: ban } = await db.from("hyperpop_sentinel_bans").select("id,account_id,device_id").eq("id", banId).maybeSingle();
    if (!ban || (account && ban.account_id && ban.account_id !== account.id)) return reply({ ok: false, error: "Ban not found for this account." }, 404);
    const { error } = await db.from("hyperpop_sentinel_appeals").insert({ ban_id: banId, account_id: account?.id || null, message });
    if (error) return reply({ ok: false, error: "Could not submit appeal." }, 500);
    await db.from("hyperpop_sentinel_events").insert({ actor_account_id: account?.id || null, event_type: "appeal_submitted", details: { ban_id: banId }, ip });
    return reply({ ok: true });
  }

  if (!account) return reply({ ok: false, error: "Sign in with an administrator account." }, 401);
  const { data: admin } = await db.from("hyperpop_sentinel_admins").select("account_id").eq("account_id", account.id).maybeSingle();
  if (!admin) return reply({ ok: false, error: "Sentinel administrator permission required." }, 403);

  if (action === "accounts") {
    const q = String(body.search || "").trim().slice(0, 40);
    let query = db.from("hyperpop_accounts").select("id,username,display_name,created_at").order("username", { ascending: true }).limit(300);
    if (q) query = query.ilike("username", "%" + q.replace(/[%_]/g, "") + "%");
    const { data, error } = await query;
    if (error) return reply({ ok: false, error: "Could not load account directory." }, 500);
    const ids = (data || []).map(x => x.id); const counts: Record<string, number> = {};
    if (ids.length) { const { data: links } = await db.from("hyperpop_sentinel_device_accounts").select("account_id").in("account_id", ids); for (const l of links || []) counts[l.account_id] = (counts[l.account_id] || 0) + 1; }
    return reply({ ok: true, accounts: (data || []).map(x => ({ id:x.id, username:x.username, display_name:x.display_name, created_at:x.created_at, device_count:counts[x.id] || 0 })) });
  }

  if (action === "overview") {
    const [bans, devices, appeals, events, accounts] = await Promise.all([
      db.from("hyperpop_sentinel_bans").select("*,hyperpop_accounts!hyperpop_sentinel_bans_account_id_fkey(username)").order("created_at", { ascending: false }).limit(150),
      db.from("hyperpop_sentinel_devices").select("id,device_key,first_seen_at,last_seen_at,last_ip,user_agent,device_info").order("last_seen_at", { ascending: false }).limit(150),
      db.from("hyperpop_sentinel_appeals").select("*,hyperpop_accounts(username)").order("created_at", { ascending: false }).limit(100),
      db.from("hyperpop_sentinel_events").select("*").order("created_at", { ascending: false }).limit(100),
      db.from("hyperpop_accounts").select("id,username,display_name,created_at").order("username", { ascending: true }).limit(300),
    ]);
    const deviceRows = devices.data || [], deviceIds = deviceRows.map(x => x.id), linksByDevice: Record<string, any[]> = {};
    if (deviceIds.length) { const { data: links } = await db.from("hyperpop_sentinel_device_accounts").select("device_id,account_id,hyperpop_accounts(username)").in("device_id", deviceIds); for (const l of links || []) (linksByDevice[l.device_id] ??= []).push({ account_id:l.account_id, username:(l as any).hyperpop_accounts?.username || "Unknown" }); }
    const accountCounts: Record<string, number> = {};
    for (const rows of Object.values(linksByDevice)) for (const l of rows) accountCounts[l.account_id] = (accountCounts[l.account_id] || 0) + 1;
    return reply({ ok:true, bans:bans.data || [], devices:deviceRows.map(x => ({...x, linked_accounts:linksByDevice[x.id] || []})), appeals:appeals.data || [], events:events.data || [], accounts:(accounts.data || []).map(x => ({...x, device_count:accountCounts[x.id] || 0})) });
  }

  if (action === "issue") {
    const scope = String(body.scope || ""), duration = String(body.duration || ""), reason = String(body.reason || "").trim();
    if (!["account","device","network","account_device","full"].includes(scope) || !Object.prototype.hasOwnProperty.call(durationMs, duration) || reason.length < 3 || reason.length > 500)
      return reply({ ok: false, error: "Choose a valid scope, duration, and reason (3-500 characters)." }, 400);
    const targetUsername = String(body.username || "").trim();
    const targetDeviceKey = validDevice(body.target_device_key) ? String(body.target_device_key).toLowerCase() : null;
    const targetIp = String(body.network_ip || "").trim();
    let targetAccountId: string | null = null, targetDeviceId: string | null = null;
    if (["account","account_device","full"].includes(scope)) {
      if (!/^[a-z0-9_]{3,20}$/i.test(targetUsername)) return reply({ ok: false, error: "Enter the target username." }, 400);
      const { data } = await db.from("hyperpop_accounts").select("id").ilike("username", targetUsername).maybeSingle();
      if (!data) return reply({ ok: false, error: "Account not found." }, 404);
      targetAccountId = data.id;
    }
    if (scope === "device") {
      if (!targetDeviceKey) return reply({ ok: false, error: "Enter a valid device key." }, 400);
      const { data } = await db.from("hyperpop_sentinel_devices").select("id").eq("device_key", targetDeviceKey).maybeSingle();
      if (!data) return reply({ ok: false, error: "Device has not registered with Sentinel yet." }, 404);
      targetDeviceId = data.id;
    }
    if (scope === "network") {
      if (!/^[0-9a-f:.]+$/i.test(targetIp)) return reply({ ok: false, error: "Enter a valid IPv4 or IPv6 address." }, 400);
    }
    const expiresAt = durationMs[duration] === null ? null : new Date(Date.now() + durationMs[duration]!).toISOString();
    const rows: any[] = [];
    const base = { scope, reason, duration, expires_at: expiresAt, created_by: account.id };
    if (targetAccountId) rows.push({ ...base, account_id: targetAccountId });
    if (targetDeviceId) rows.push({ ...base, device_id: targetDeviceId });
    if (scope === "network") rows.push({ ...base, network_ip: targetIp });
    if (["account_device","full"].includes(scope) && targetAccountId) {
      const { data: links } = await db.from("hyperpop_sentinel_device_accounts").select("device_id").eq("account_id", targetAccountId);
      for (const link of links || []) rows.push({ ...base, device_id: link.device_id });
      if (scope === "full") {
        const ids = (links || []).map(x => x.device_id);
        if (ids.length) {
          const { data: devs } = await db.from("hyperpop_sentinel_devices").select("last_ip").in("id", ids);
          for (const d of devs || []) if (d.last_ip) rows.push({ ...base, network_ip: d.last_ip });
        }
      }
    }
    const { data: created, error } = await db.from("hyperpop_sentinel_bans").insert(rows).select("id,scope,account_id,device_id,network_ip,reason,duration,expires_at");
    if (error) return reply({ ok: false, error: "Could not issue ban: " + error.message }, 500);
    if (targetAccountId) await db.from("hyperpop_sessions").delete().eq("account_id", targetAccountId);
    await db.from("hyperpop_sentinel_events").insert({ actor_account_id: account.id, event_type: "ban_issued", details: { scope, target_username: targetUsername || null, reason, duration, ban_count: created?.length || 0 }, ip });
    return reply({ ok: true, bans: created || [] });
  }

  if (action === "revoke") {
    const banId = String(body.ban_id || "");
    if (!banId) return reply({ ok: false, error: "Ban ID required." }, 400);
    const { data, error } = await db.from("hyperpop_sentinel_bans").update({ revoked_at: now, revoked_by: account.id }).eq("id", banId).is("revoked_at", null).select("id").maybeSingle();
    if (error || !data) return reply({ ok: false, error: "Ban could not be revoked." }, 404);
    await db.from("hyperpop_sentinel_events").insert({ actor_account_id: account.id, event_type: "ban_revoked", details: { ban_id: banId }, ip });
    return reply({ ok: true });
  }

  if (action === "review_appeal") {
    const appealId = String(body.appeal_id || ""), status = String(body.status || "");
    if (!appealId || !["approved","denied"].includes(status)) return reply({ ok: false, error: "Invalid appeal decision." }, 400);
    const { data, error } = await db.from("hyperpop_sentinel_appeals").update({ status, reviewed_by: account.id, reviewed_at: now, review_note: String(body.note || "").slice(0,1000) }).eq("id", appealId).eq("status","pending").select("id,ban_id").maybeSingle();
    if (error || !data) return reply({ ok: false, error: "Appeal is no longer pending." }, 409);
    if (status === "approved") await db.from("hyperpop_sentinel_bans").update({ revoked_at: now, revoked_by: account.id }).eq("id", data.ban_id).is("revoked_at", null);
    await db.from("hyperpop_sentinel_events").insert({ actor_account_id: account.id, event_type: "appeal_reviewed", details: { appeal_id: appealId, status }, ip });
    return reply({ ok: true });
  }

  return reply({ ok: false, error: "Unknown Sentinel action." }, 400);
});