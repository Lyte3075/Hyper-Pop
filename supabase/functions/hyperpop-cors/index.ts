const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin"
};

const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const ALLOWED_METHODS = new Set(["GET", "HEAD", "POST"]);
const ALLOWED_TARGET_HEADERS = new Set([
  "accept", "content-type", "authorization", "x-api-key",
  "x-github-api-version", "if-none-match", "if-modified-since"
]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function isPrivateIPv4(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113);
}

function isPrivateIPv6(value: string) {
  const ip = value.toLowerCase().split("%")[0];
  return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") ||
    /^fe[89ab]/.test(ip) || ip.startsWith("ff") || ip.startsWith("2001:db8:") ||
    ip.startsWith("::ffff:");
}

function validateTargetUrl(value: string): URL {
  if (!value || value.length > 2048) throw new Error("Enter a valid URL (maximum 2,048 characters).");
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Only HTTPS destinations are supported.");
  if (url.username || url.password) throw new Error("URLs containing embedded credentials are not allowed.");
  if (url.port && url.port !== "443") throw new Error("Only the standard HTTPS port is allowed.");

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") ||
      host.endsWith(".lan") || host.endsWith(".home.arpa") ||
      host.endsWith(".test") || host.endsWith(".invalid") ||
      host.endsWith(".example") || host === "metadata.google.internal" ||
      host === "metadata.google" || host === "host.docker.internal" ||
      host === "169.254.169.254") {
    throw new Error("That destination is not allowed.");
  }
  if (/^[0-9.]+$/.test(host) || host.includes(":")) {
    throw new Error("IP-address destinations are not allowed. Use a public HTTPS hostname.");
  }
  url.hash = "";
  return url;
}

async function assertPublicDns(host: string) {
  // Fail closed if DNS cannot be checked. Both A and AAAA records are checked
  // before every initial request and redirect to reduce SSRF/rebinding risk.
  const lookups = await Promise.allSettled([
    Deno.resolveDns(host, "A"),
    Deno.resolveDns(host, "AAAA")
  ]);
  const addresses: string[] = [];
  for (const result of lookups) {
    if (result.status === "fulfilled") addresses.push(...result.value);
  }
  if (!addresses.length) throw new Error("The destination hostname could not be verified.");
  for (const address of addresses) {
    if (address.includes(":") ? isPrivateIPv6(address) : isPrivateIPv4(address)) {
      throw new Error("The destination resolves to a private or reserved network address.");
    }
  }
}

async function verifyHyperPopSession(token: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  let anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!anonKey) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
      anonKey = keys.default || Object.values(keys)[0] || "";
    } catch { /* no publishable key available */ }
  }
  if (!baseUrl || !anonKey) throw new Error("Proxy authentication is not configured.");

  const authHeaders: Record<string, string> = {
    "apikey": anonKey,
    "Content-Type": "application/json"
  };
  if (!anonKey.startsWith("sb_publishable_")) authHeaders["Authorization"] = "Bearer " + anonKey;

  const response = await fetch(baseUrl + "/rest/v1/rpc/hyperpop_me", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ p_token: token }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Could not verify the Hyper-Pop session.");
  const result = await response.json();
  if (!result || result.ok !== true || !result.id) return null;
  return { id: String(result.id), username: String(result.username || "") };
}

async function consumeQuota(userId: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  let serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!serviceKey) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      serviceKey = keys.default || Object.values(keys)[0] || "";
    } catch { /* no secret key available */ }
  }
  if (!baseUrl || !serviceKey) throw new Error("Proxy quota protection is not configured.");

  const serviceHeaders: Record<string, string> = {
    "apikey": serviceKey,
    "Content-Type": "application/json"
  };
  if (!serviceKey.startsWith("sb_secret_")) serviceHeaders["Authorization"] = "Bearer " + serviceKey;

  const response = await fetch(baseUrl + "/rest/v1/rpc/hyperpop_proxy_consume_quota", {
    method: "POST",
    headers: serviceHeaders,
    body: JSON.stringify({ p_user_id: userId }),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Could not check proxy usage limits.");
  return await response.json();
}

async function readLimited(response: Response, limit: number) {
  const declared = Number(response.headers.get("content-length") || "0");
  if (declared > limit) throw new Error("The destination response is too large.");
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error("The destination response is too large.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

async function fetchDestination(start: URL, method: string, headers: Headers, body: string | undefined) {
  let current = start;
  let currentMethod = method;
  let currentBody = body;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    await assertPublicDns(current.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        method: currentMethod,
        headers,
        body: currentMethod === "GET" || currentMethod === "HEAD" ? undefined : currentBody,
        redirect: "manual",
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The destination returned an invalid redirect.");
      if (attempt === MAX_REDIRECTS) throw new Error("The destination redirected too many times.");
      current = validateTargetUrl(new URL(location, current).toString());
      if (response.status === 303 || ((response.status === 301 || response.status === 302) && currentMethod === "POST")) {
        currentMethod = "GET";
        currentBody = undefined;
      }
      continue;
    }
    return response;
  }
  throw new Error("The destination could not be reached.");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST is required." }, 405);

  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (!match) return json({ ok: false, error: "Sign in with a Hyper-Pop account to use this proxy." }, 401);

    const user = await verifyHyperPopSession(match[1]);
    if (!user) return json({ ok: false, error: "Your Hyper-Pop session is invalid or expired. Sign in again." }, 401);

    const quota = await consumeQuota(user.id);
    if (!quota?.allowed) {
      return json({
        ok: false,
        error: "You've reached your proxy usage limit. Please try again later.",
        limits: { perMinute: quota?.minute_limit || 30, perDay: quota?.daily_limit || 500 }
      }, 429);
    }

    const declaredLength = Number(req.headers.get("content-length") || "0");
    if (declaredLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Request body is too large." }, 413);
    const raw = await req.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Request body is too large." }, 413);

    let input: any;
    try { input = JSON.parse(raw); } catch { return json({ ok: false, error: "A JSON request body is required." }, 400); }

    const target = validateTargetUrl(String(input?.url || ""));
    const method = String(input?.method || "GET").toUpperCase();
    if (!ALLOWED_METHODS.has(method)) return json({ ok: false, error: "Only GET, HEAD and POST requests are supported." }, 405);

    const targetHeaders = new Headers({ "User-Agent": "Hyper-Pop-CORS-Proxy/1.0", "Accept": "*/*" });
    if (input?.headers && typeof input.headers === "object" && !Array.isArray(input.headers)) {
      for (const [rawName, rawValue] of Object.entries(input.headers)) {
        const name = String(rawName).toLowerCase();
        if (!ALLOWED_TARGET_HEADERS.has(name)) continue;
        const value = String(rawValue);
        if (value.length > 4096 || /[\r\n]/.test(value)) return json({ ok: false, error: "A destination header is invalid." }, 400);
        targetHeaders.set(name, value);
      }
    }

    let body: string | undefined;
    if (method === "POST" && input?.body !== undefined && input?.body !== null) {
      body = typeof input.body === "string" ? input.body : JSON.stringify(input.body);
      if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Destination request body is too large." }, 413);
      if (!targetHeaders.has("content-type")) targetHeaders.set("content-type", "application/json");
    }

    const upstream = await fetchDestination(target, method, targetHeaders, body);
    const bytes = method === "HEAD" || upstream.status === 204 || upstream.status === 304
      ? new Uint8Array()
      : await readLimited(upstream, MAX_RESPONSE_BYTES);

    const responseHeaders = new Headers(corsHeaders);
    responseHeaders.set("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    responseHeaders.set("Cache-Control", "no-store");
    responseHeaders.set("X-Proxy-Target-Status", String(upstream.status));
    responseHeaders.set("Access-Control-Expose-Headers", "Content-Type, X-Proxy-Target-Status, ETag, Last-Modified");
    const etag = upstream.headers.get("etag");
    const modified = upstream.headers.get("last-modified");
    if (etag) responseHeaders.set("ETag", etag);
    if (modified) responseHeaders.set("Last-Modified", modified);

    return new Response(bytes.length ? bytes : null, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed.";
    const status = /too large/i.test(message) ? 413 :
      /private|not allowed|IP-address|HTTPS|hostname|credentials|port|URL|redirect/i.test(message) ? 400 :
      /aborted|timeout/i.test(message) ? 504 : 502;
    return json({ ok: false, error: message }, status);
  }
});
