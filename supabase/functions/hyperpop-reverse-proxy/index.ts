const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, range",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "600",
  "Vary": "Origin"
};

const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 3;
const ROUTE_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const FORWARDED_HEADERS = new Set(["accept", "content-type", "if-none-match", "if-modified-since", "range"]);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function serviceCredentials() {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!key) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
      key = keys.default || Object.values(keys)[0] || "";
    } catch { /* configured below */ }
  }
  if (!baseUrl || !key) throw new Error("Reverse proxy backend is not configured.");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
  return { baseUrl, headers };
}

async function verifySession(token: string) {
  const baseUrl = Deno.env.get("SUPABASE_URL");
  let key = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!key) {
    try {
      const keys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
      key = keys.default || Object.values(keys)[0] || "";
    } catch { /* no publishable key */ }
  }
  if (!baseUrl || !key) throw new Error("Proxy authentication is not configured.");
  const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
  if (!key.startsWith("sb_publishable_")) headers.Authorization = "Bearer " + key;
  const response = await fetch(baseUrl + "/rest/v1/rpc/hyperpop_me", {
    method: "POST", headers, body: JSON.stringify({ p_token: token }), signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Could not verify the Hyper-Pop session.");
  const result = await response.json();
  if (!result || result.ok !== true || !result.id) return null;
  return { id: String(result.id), username: String(result.username || "") };
}

async function rpc(name: string, payload: Record<string, unknown>) {
  const { baseUrl, headers } = serviceCredentials();
  const response = await fetch(baseUrl + "/rest/v1/rpc/" + name, {
    method: "POST", headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error("The reverse proxy database request failed.");
  return await response.json();
}

async function consumeQuota(userId: string) {
  const result = await rpc("hyperpop_proxy_consume_quota", { p_user_id: userId });
  if (!result?.allowed) {
    const error = new Error("You've reached your proxy usage limit. Please try again later.");
    (error as any).status = 429;
    throw error;
  }
}

function isPrivateIPv4(value: string) {
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b, c] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113);
}

function isPrivateIPv6(value: string) {
  const ip = value.toLowerCase().split("%")[0];
  return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") ||
    /^fe[89ab]/.test(ip) || ip.startsWith("ff") || ip.startsWith("2001:db8:") ||
    ip.startsWith("::ffff:");
}

function validateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") ||
      host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan") ||
      host.endsWith(".home.arpa") || host.endsWith(".test") || host.endsWith(".invalid") ||
      host.endsWith(".example") || host === "metadata.google.internal" ||
      host === "metadata.google" || host === "host.docker.internal" ||
      /^[0-9.]+$/.test(host) || host.includes(":")) {
    throw new Error("That destination domain is not allowed.");
  }
  return host;
}

async function assertPublicDns(host: string) {
  const results = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const addresses: string[] = [];
  for (const result of results) if (result.status === "fulfilled") addresses.push(...result.value);
  if (!addresses.length) throw new Error("The destination hostname could not be verified.");
  for (const address of addresses) {
    if (address.includes(":") ? isPrivateIPv6(address) : isPrivateIPv4(address)) {
      throw new Error("The destination resolves to a private or reserved network address.");
    }
  }
}

async function validateOrigin(value: string) {
  if (!value || value.length > 255) throw new Error("Enter a valid HTTPS origin.");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password ||
      (url.port && url.port !== "443") || (url.pathname !== "/" && url.pathname !== "") ||
      url.search || url.hash) {
    throw new Error("A route origin must be an HTTPS domain only, without credentials, path, query, or custom port.");
  }
  const host = validateHostname(url.hostname);
  await assertPublicDns(host);
  return "https://" + host;
}

function validatePathPrefix(value: unknown) {
  let path = String(value || "");
  if (path.length > 512) throw new Error("The upstream path prefix is too long.");
  if (!path || path === "/") return "";
  if (!path.startsWith("/")) path = "/" + path;
  let decoded = path;
  try { decoded = decodeURIComponent(path); } catch { throw new Error("The upstream path prefix contains invalid encoding."); }
  if (decoded.includes("\\") || decoded.split("/").some(part => part === "." || part === "..") || path.includes("//")) {
    throw new Error("The upstream path prefix contains an unsafe path segment.");
  }
  return path.replace(/\/$/, "");
}

function validateSecretHeaders(value: unknown) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Secret headers must be a JSON object.");
  const result: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const name = rawName.toLowerCase();
    if (!["authorization", "x-api-key"].includes(name)) throw new Error("Only Authorization and X-Api-Key can be stored as upstream secrets.");
    const text = String(rawValue);
    if (!text || text.length > 4096 || /[\r\n]/.test(text)) throw new Error("An upstream secret header is invalid.");
    result[name] = text;
  }
  return result;
}

async function readLimited(response: Response, limit: number) {
  const declared = Number(response.headers.get("content-length") || "0");
  if (declared > limit) throw new Error("The upstream response is too large.");
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
      throw new Error("The upstream response is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function getFunctionPath(url: URL) {
  const marker = "/hyperpop-reverse-proxy";
  const index = url.pathname.indexOf(marker);
  return index < 0 ? "" : url.pathname.slice(index + marker.length) || "/";
}

async function handleManage(req: Request, userId: string) {
  if (req.method !== "POST") return json({ ok: false, error: "POST is required for route management." }, 405);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > 64 * 1024) return json({ ok: false, error: "Request is too large." }, 413);
  let input: any;
  try { input = JSON.parse(raw); } catch { return json({ ok: false, error: "A JSON request body is required." }, 400); }

  const action = String(input?.action || "");
  if (action === "list") {
    return json(await rpc("hyperpop_proxy_route_action", { p_user_id: userId, p_action: "list" }));
  }
  if (action === "delete") {
    const slug = String(input?.slug || "");
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) return json({ ok: false, error: "Invalid route name." }, 400);
    return json(await rpc("hyperpop_proxy_route_action", { p_user_id: userId, p_action: "delete", p_slug: slug }));
  }
  if (action === "save") {
    const slug = String(input?.slug || "").toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) return json({ ok: false, error: "Use a route name with lowercase letters, numbers, and hyphens." }, 400);
    const origin = await validateOrigin(String(input?.origin || ""));
    const pathPrefix = validatePathPrefix(input?.pathPrefix);
    const methods = Array.isArray(input?.methods) ? [...new Set(input.methods.map((x: unknown) => String(x).toUpperCase()))] : ["GET", "HEAD"];
    if (!methods.length || methods.length > 7 || methods.some((m: string) => !ROUTE_METHODS.has(m))) {
      return json({ ok: false, error: "Choose one or more supported HTTP methods." }, 400);
    }
    const secretHeaders = validateSecretHeaders(input?.secretHeaders);
    const result = await rpc("hyperpop_proxy_route_action", {
      p_user_id: userId, p_action: "save", p_slug: slug, p_origin: origin,
      p_path_prefix: pathPrefix, p_methods: methods, p_secret_headers: secretHeaders
    });
    return json(result);
  }
  return json({ ok: false, error: "Unknown route management action." }, 400);
}

async function handleProxy(req: Request, userId: string, routePath: string) {
  const parts = routePath.slice(3).split("/");
  const slug = decodeURIComponent(parts.shift() || "");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) return json({ ok: false, error: "Invalid route." }, 404);
  const method = req.method.toUpperCase();
  if (!ROUTE_METHODS.has(method)) return json({ ok: false, error: "This HTTP method is not supported." }, 405);

  const route = await rpc("hyperpop_proxy_route_action", { p_user_id: userId, p_action: "get", p_slug: slug });
  if (!route?.ok) return json({ ok: false, error: "Route not found or disabled." }, 404);
  if (!route.allowed_methods?.includes(method)) return json({ ok: false, error: "This method is not enabled for the route." }, 405);

  const suffixParts: string[] = [];
  for (const part of parts) {
    let decoded = "";
    try { decoded = decodeURIComponent(part); } catch { return json({ ok: false, error: "Invalid path encoding." }, 400); }
    if (!decoded || decoded === "." || decoded === ".." || decoded.includes("/") || decoded.includes("\\")) {
      return json({ ok: false, error: "Unsafe path segment." }, 400);
    }
    suffixParts.push(encodeURIComponent(decoded));
  }

  const origin = new URL(route.origin);
  const upstreamPath = [route.path_prefix || "", suffixParts.length ? "/" + suffixParts.join("/") : ""].join("") || "/";
  const incoming = new URL(req.url);
  const target = new URL(origin.origin + (upstreamPath.startsWith("/") ? upstreamPath : "/" + upstreamPath) + incoming.search);
  await assertPublicDns(validateHostname(target.hostname));

  const headers = new Headers({ "User-Agent": "Hyper-Pop-Reverse-Proxy/1.0", "Accept": "*/*" });
  for (const [name, value] of req.headers.entries()) {
    if (FORWARDED_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  const secrets = route.secret_headers && typeof route.secret_headers === "object" ? route.secret_headers : {};
  for (const [name, value] of Object.entries(secrets)) {
    if (["authorization", "x-api-key"].includes(name.toLowerCase())) headers.set(name, String(value));
  }

  let body: Uint8Array | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > MAX_REQUEST_BYTES) return json({ ok: false, error: "Request body is too large." }, 413);
    if (bytes.byteLength) body = bytes;
  }

  let current = target;
  let upstream: Response | null = null;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt++) {
    await assertPublicDns(validateHostname(current.hostname));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      upstream = await fetch(current, {
        method, headers, body: ["GET", "HEAD"].includes(method) ? undefined : body,
        redirect: "manual", signal: controller.signal
      });
    } finally { clearTimeout(timer); }

    if ([301, 302, 303, 307, 308].includes(upstream.status)) {
      const location = upstream.headers.get("location");
      if (!location) return json({ ok: false, error: "The upstream returned an invalid redirect." }, 502);
      if (attempt === MAX_REDIRECTS) return json({ ok: false, error: "The upstream redirected too many times." }, 502);
      const next = new URL(location, current);
      if (next.protocol !== "https:" || next.hostname.toLowerCase() !== origin.hostname.toLowerCase() ||
          next.port && next.port !== "443" || next.username || next.password) {
        return json({ ok: false, error: "The upstream redirect left the configured domain." }, 502);
      }
      current = next;
      continue;
    }
    break;
  }
  if (!upstream) return json({ ok: false, error: "The upstream could not be reached." }, 502);

  const bytes = method === "HEAD" || upstream.status === 204 || upstream.status === 304
    ? new Uint8Array() : await readLimited(upstream, MAX_RESPONSE_BYTES);
  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Hyper-Pop-Upstream-Status", String(upstream.status));
  for (const name of ["content-type", "etag", "last-modified", "accept-ranges"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Access-Control-Expose-Headers", "Content-Type, ETag, Last-Modified, Accept-Ranges, X-Hyper-Pop-Upstream-Status");
  return new Response(bytes.length ? bytes : null, { status: upstream.status, headers: responseHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const auth = req.headers.get("authorization") || "";
    const match = auth.match(/^Bearer\s+([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
    if (!match) return json({ ok: false, error: "Sign in with a Hyper-Pop account to use the reverse proxy." }, 401);
    const user = await verifySession(match[1]);
    if (!user) return json({ ok: false, error: "Your Hyper-Pop session is invalid or expired. Sign in again." }, 401);

    const path = getFunctionPath(new URL(req.url));
    if (path === "/manage" || path === "/manage/") {
      await consumeQuota(user.id);
      return await handleManage(req, user.id);
    }
    if (path === "/r/" || path.startsWith("/r/")) {
      await consumeQuota(user.id);
      return await handleProxy(req, user.id, path.slice(1));
    }
    return json({ ok: false, error: "Use /manage for route management or /r/{route} for proxy requests." }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reverse proxy request failed.";
    const status = Number((error as any)?.status) || (/too large/i.test(message) ? 413 :
      /private|not allowed|unsafe|HTTPS|domain|hostname|credentials|port|redirect|encoding|path prefix|route name|supported HTTP/i.test(message) ? 400 :
      /aborted|timeout/i.test(message) ? 504 : 502);
    return json({ ok: false, error: message }, status);
  }
});
