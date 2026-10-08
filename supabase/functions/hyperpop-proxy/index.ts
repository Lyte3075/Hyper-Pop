const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

const ENDPOINT = "https://iapnejlttsqqefkpmelp.supabase.co/functions/v1/hyperpop-proxy";
const MAX_URL_LENGTH = 2048;
const MAX_HTML_SIZE = 2 * 1024 * 1024;
const MAX_RESOURCE_SIZE = 8 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT = 12000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function blockedHostname(hostname: string) {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal" || h === "metadata.google" || h === "host.docker.internal") return true;
  if (/^\d+(\.\d+){3}$/.test(h)) {
    const p = h.split(".").map(Number);
    if (p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254)) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
  }
  if (h === "::1" || h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  return false;
}

function validateUrl(value: string): URL {
  if (!value || value.length > MAX_URL_LENGTH) throw new Error("Invalid or oversized URL.");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are allowed.");
  if (url.username || url.password) throw new Error("URLs with embedded credentials are not allowed.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only ports 80 and 443 are allowed.");
  if (blockedHostname(url.hostname)) throw new Error("That destination is not allowed.");
  return url;
}

async function fetchChecked(start: URL, accept: string) {
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const response = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "Hyper-Pop-Web-Proxy/2.0",
          "Accept": accept
        }
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect has no destination.");
        current = validateUrl(new URL(location, current).toString());
        continue;
      }
      return { response, url: current };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("Too many redirects.");
}

function proxyPage(url: URL) {
  return "/proxy.html?url=" + encodeURIComponent(url.toString());
}

function proxyResource(url: URL) {
  return ENDPOINT + "?resource=1&url=" + encodeURIComponent(url.toString());
}

function rewriteUrl(raw: string, baseUrl: URL, resource: boolean) {
  const value = raw.trim();
  if (!value || value.startsWith("#") || value.startsWith("data:") || value.startsWith("blob:")) return raw;
  try {
    const absolute = new URL(value, baseUrl);
    if (!["http:", "https:"].includes(absolute.protocol)) return raw;
    return resource ? proxyResource(absolute) : proxyPage(absolute);
  } catch {
    return raw;
  }
}

function rewriteHtml(html: string, baseUrl: URL) {
  let out = html;

  for (const tag of ["iframe", "object", "applet", "noscript"]) {
    const open = "<" + tag;
    const close = "</" + tag + ">";
    while (true) {
      const lower = out.toLowerCase();
      const start = lower.indexOf(open);
      if (start === -1) break;
      const end = lower.indexOf(close, start);
      out = end === -1 ? out.slice(0, start) : out.slice(0, start) + out.slice(end + close.length);
    }
  }

  const resource = (raw: string) => rewriteUrl(raw, baseUrl, true);
  const page = (raw: string) => {
    const value = raw.trim();
    if (!value || value.startsWith("#")) return value;
    try {
      const absolute = new URL(value, baseUrl);
      return ["http:", "https:"].includes(absolute.protocol) ? absolute.toString() : value;
    } catch {
      return value;
    }
  };

  out = out.replace(/(<script\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<(?:source|video|audio|track|input)\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<link\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<(?:a|area)\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + page(raw) + q);
  out = out.replace(/(<form\b[^>]*\baction\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + page(raw) + q);
  out = out.replace(/(\bsrcset\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => {
    const value = raw.split(",").map((part: string) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return part;
      bits[0] = resource(bits[0]);
      return bits.join(" ");
    }).join(", ");
    return p + q + value + q;
  });

  out = out.replace(/\s+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/<base\b[^>]*>/gi, "");

  const bridge = `<script>
(function(){
  function send(url){ try { parent.postMessage({type:"hyperpop-navigate",url:new URL(url,document.baseURI).href},"*"); } catch(e){} }
  document.addEventListener("click",function(e){
    var a=e.target.closest&&e.target.closest("a[href]");
    if(!a)return;
    var href=a.getAttribute("href");
    if(!href||href[0]==="#"||/^(mailto:|tel:|javascript:|data:|blob:)/i.test(href))return;
    e.preventDefault();
    send(href);
  },true);
  document.addEventListener("submit",function(e){
    var f=e.target;
    if(!f||String(f.method||"get").toLowerCase()!=="get")return;
    e.preventDefault();
    var action=f.getAttribute("action")||document.location.href;
    var u=new URL(action,document.baseURI);
    var q=new URLSearchParams(new FormData(f));
    u.search=q.toString();
    send(u.href);
  },true);
  window.addEventListener("error",function(){});
})();
</script>`;

  const lower = out.toLowerCase();
  const bodyEnd = lower.lastIndexOf("</body>");
  if (bodyEnd >= 0) out = out.slice(0, bodyEnd) + bridge + out.slice(bodyEnd);
  else out += bridge;

  return "<!doctype html>\n" + out;
}
function rewriteCss(css: string, baseUrl: URL) {
  return css.replace(/url\\(\\s*(["']?)(.*?)\\1\\s*\\)/gi, (m, q, raw) =>
    "url(" + q + rewriteUrl(raw, baseUrl, true) + q + ")"
  ).replace(/@import\\s+(["'])(.*?)\\1/gi, (m, q, raw) =>
    "@import " + q + rewriteUrl(raw, baseUrl, true) + q
  );
}

async function resourceResponse(target: URL) {
  const { response, url } = await fetchChecked(target, "*/*");
  if (!response.ok) return new Response("Target returned HTTP " + response.status + ".", { status: 502, headers: { "Access-Control-Allow-Origin": "*" } });
  const length = Number(response.headers.get("content-length") || "0");
  if (length > MAX_RESOURCE_SIZE) return new Response("Resource too large.", { status: 413, headers: { "Access-Control-Allow-Origin": "*" } });

  const type = response.headers.get("content-type") || "application/octet-stream";
  let body: BodyInit = response.body ?? "";
  if (type.toLowerCase().includes("text/css")) {
    const css = await response.text();
    if (new TextEncoder().encode(css).byteLength > MAX_RESOURCE_SIZE) return new Response("Resource too large.", { status: 413 });
    body = rewriteCss(css, url);
  }
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", type);
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(body, { status: response.status, headers });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const requestUrl = new URL(req.url);
    const rawTarget = requestUrl.searchParams.get("url") || "";

    if (req.method === "GET" && requestUrl.searchParams.get("resource") === "1") {
      const target = validateUrl(rawTarget);
      return await resourceResponse(target);
    }

    if (req.method !== "POST") return json({ ok: false, error: "POST required." }, 405);

    const body = await req.json();
    const target = validateUrl(String(body?.url || "").trim());
    const { response, url } = await fetchChecked(target, "text/html,application/xhtml+xml");
    if (!response.ok) return json({ ok: false, error: "Target returned HTTP " + response.status + "." }, 502);

    const type = response.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("text/html") && !type.toLowerCase().includes("application/xhtml+xml")) {
      return json({ ok: false, error: "This proxy currently supports HTML pages only." }, 415);
    }

    const length = Number(response.headers.get("content-length") || "0");
    if (length > MAX_HTML_SIZE) return json({ ok: false, error: "The page is too large." }, 413);

    const html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_SIZE) return json({ ok: false, error: "The page is too large." }, 413);

    return json({ ok: true, url: url.toString(), status: response.status, html: rewriteHtml(html, url) });
  } catch (error) {
    return json({ ok: false, error: error instanceof Error ? error.message : "Proxy request failed." }, 400);
  }
});