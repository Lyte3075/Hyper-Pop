import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function getSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.default === "string") return parsed.default;
    } catch {
      // Fall through to the configuration error.
    }
  }
  return "";
}

function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6 && value.length <= 100;
}

function validRecoveryCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/i.test(value);
}

async function findSession(supabase: ReturnType<typeof createClient>, token: string) {
  const { data, error } = await supabase
    .from("hyperpop_sessions")
    .select("account_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data?.account_id) return null;
  return data.account_id as string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ ok: false, error: "POST required." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ ok: false, error: "Invalid request body." }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = getSecretKey();
  if (!url || !key) return reply({ ok: false, error: "Account security service is not configured." }, 500);

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const action = String(body.action || "");

  if (action === "set_recovery") {
    const token = String(body.token || "");
    const recoveryCode = body.recovery_code;
    if (!token || !validRecoveryCode(recoveryCode)) {
      return reply({ ok: false, error: "A valid signed-in session and recovery code are required." }, 400);
    }
    const accountId = await findSession(supabase, token);
    if (!accountId) return reply({ ok: false, error: "Your session has expired. Please log in again." }, 401);

    const recoveryHash = await bcrypt.hash(recoveryCode.toLowerCase(), 10);
    const { error } = await supabase
      .from("hyperpop_accounts")
      .update({ recovery_code_hash: recoveryHash })
      .eq("id", accountId);
    if (error) return reply({ ok: false, error: "Could not save your recovery code. Please try again." }, 500);
    return reply({ ok: true });
  }

  if (action === "change_password") {
    const token = String(body.token || "");
    const currentPassword = body.current_password;
    const newPassword = body.new_password;
    if (!token || typeof currentPassword !== "string" || !validPassword(newPassword)) {
      return reply({ ok: false, error: "Enter your current password and a new password of 6-100 characters." }, 400);
    }
    const accountId = await findSession(supabase, token);
    if (!accountId) return reply({ ok: false, error: "Your session has expired. Please log in again." }, 401);

    const { data: account, error: accountError } = await supabase
      .from("hyperpop_accounts")
      .select("id,password_hash")
      .eq("id", accountId)
      .maybeSingle();
    if (accountError || !account?.password_hash) return reply({ ok: false, error: "Could not verify this account." }, 500);

    let matches = false;
    try { matches = await bcrypt.compare(currentPassword, account.password_hash); } catch { matches = false; }
    if (!matches) return reply({ ok: false, error: "Current password is incorrect." }, 400);

    const newHash = await bcrypt.hash(newPassword, 6);
    const { error: revokeError } = await supabase
      .from("hyperpop_sessions")
      .delete()
      .eq("account_id", accountId)
      .neq("token", token);
    if (revokeError) return reply({ ok: false, error: "Could not secure the other sessions. Please try again." }, 500);

    const { data: updated, error: updateError } = await supabase
      .from("hyperpop_accounts")
      .update({ password_hash: newHash })
      .eq("id", accountId)
      .eq("password_hash", account.password_hash)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) return reply({ ok: false, error: "Password could not be changed. Please try again." }, 500);
    return reply({ ok: true });
  }

  if (action === "reset_password") {
    const username = body.username;
    const recoveryCode = body.recovery_code;
    const newPassword = body.new_password;
    if (typeof username !== "string" || !/^[A-Za-z0-9_]{3,20}$/.test(username) ||
        !validRecoveryCode(recoveryCode) || !validPassword(newPassword)) {
      return reply({ ok: false, error: "Enter your username, 32-character recovery code, and a new password of 6-100 characters." }, 400);
    }

    const { data: account, error: accountError } = await supabase
      .from("hyperpop_accounts")
      .select("id,recovery_code_hash")
      .ilike("username", username)
      .maybeSingle();
    if (accountError || !account?.recovery_code_hash) {
      return reply({ ok: false, error: "Username or recovery code is incorrect." }, 400);
    }

    let matches = false;
    try { matches = await bcrypt.compare(recoveryCode.toLowerCase(), account.recovery_code_hash); } catch { matches = false; }
    if (!matches) return reply({ ok: false, error: "Username or recovery code is incorrect." }, 400);

    const newHash = await bcrypt.hash(newPassword, 6);
    const { error: revokeError } = await supabase
      .from("hyperpop_sessions")
      .delete()
      .eq("account_id", account.id);
    if (revokeError) return reply({ ok: false, error: "Could not secure the account sessions. Please try again." }, 500);

    const { data: updated, error: updateError } = await supabase
      .from("hyperpop_accounts")
      .update({ password_hash: newHash, recovery_code_hash: null })
      .eq("id", account.id)
      .eq("recovery_code_hash", account.recovery_code_hash)
      .select("id")
      .maybeSingle();
    if (updateError || !updated) return reply({ ok: false, error: "Username or recovery code is incorrect." }, 400);
    return reply({ ok: true });
  }

  return reply({ ok: false, error: "Unknown account security action." }, 400);
});
