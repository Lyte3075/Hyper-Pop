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

  for (const tag of ["object", "applet", "noscript"]) {
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
  out = out.replace(/(<iframe\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + page(raw) + q);
  out = out.replace(/(<img\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<img\b[^>]*\s(?:data-src|data-original|data-lazy-src)\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<(?:source|video|audio|track|input)\b[^>]*\s(?:data-src|data-original|data-lazy-src|poster)\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<img\b[^>]*\s(?:src|data-src|data-original|data-lazy-src)\s*=\s*)(?!["'])([^\s>]+)/gi, (_m, p, raw) => p + '"' + resource(raw) + '"');
  out = out.replace(/(<(?:source|video|audio|track)\b[^>]*\s(?:src|data-src|data-original|data-lazy-src|poster)\s*=\s*)(?!["'])([^\s>]+)/gi, (_m, p, raw) => p + '"' + resource(raw) + '"');
  out = out.replace(/(<image\b[^>]*\s(?:href|xlink:href)\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(\sstyle\s*=\s*)(["'])([\s\S]*?)\2/gi, (_m, p, q, css) => p + q + rewriteCss(css, baseUrl) + q);
  out = out.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)/gi, (_m, open, css, close) => open + rewriteCss(css, baseUrl) + close);
  out = out.replace(/(<(?:source|video|audio|track|input)\b[^>]*\bsrc\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<link\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + resource(raw) + q);
  out = out.replace(/(<(?:a|area)\b[^>]*\bhref\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + page(raw) + q);
  out = out.replace(/(<form\b[^>]*\baction\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => p + q + page(raw) + q);
  out = out.replace(/(\s(?:srcset|data-srcset)\s*=\s*)(["'])(.*?)(\2)/gis, (_m, p, q, raw) => {
    const value = raw.split(",").map((part: string) => {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) return part;
      bits[0] = resource(bits[0]);
      return bits.join(" ");
    }).join(", ");
    return p + q + value + q;
  });

  // Keep inline event handlers because interactive sites and games often depend on them.
  out = out.replace(/\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/<meta\b[^>]*http-equiv\s*=\s*(["'])?content-security-policy\1?[^>]*>/gi, "");
  out = out.replace(/<base\b[^>]*>/gi, "");

  const bridge = `<script>
(function(){
  function send(url){ try { parent.postMessage({type:"hyperpop-navigate",url:new URL(url,document.baseURI).href},"*"); } catch(e){} }
  try { window.open = function(url){ if(url) send(url); return null; }; } catch(e) {}
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
  return css.replace(/url\(\s*(["']?)(.*?)\1\s*\)/gi, (_m, q, raw) =>
    "url(" + q + rewriteUrl(raw, baseUrl, true) + q + ")"
  ).replace(/@import\s+(["'])(.*?)\1/gi, (_m, q, raw) =>
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


async function searchWeb(query: string) {
  const cleanQuery = query.trim().slice(0, 240);
  if (!cleanQuery) throw new Error("Enter something to search.");
  const headers = { "Accept": "application/json", "User-Agent": "Hyper-Pop/1.0 (built-in search)" };

  // Try one public SearXNG JSON API for general web results. If unavailable,
  // fall back to Wikipedia's stable public search API.
  try {
    const url = new URL("https://search.sapti.me/search");
    url.searchParams.set("q", cleanQuery);
    url.searchParams.set("format", "json");
    url.searchParams.set("safesearch", "1");
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (response.ok) {
      const data = await response.json();
      const results = Array.isArray(data?.results) ? data.results.slice(0, 10).map((item: any) => ({
        title: String(item?.title || "Untitled result").slice(0, 300),
        url: String(item?.url || ""),
        content: String(item?.content || item?.description || "").replace(/<[^>]*>/g, " ").slice(0, 700)
      })).filter((item: any) => {
        try { const u = new URL(item.url); return ["http:", "https:"].includes(u.protocol); } catch { return false; }
      }) : [];
      const suggestions = Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 6).map((s: unknown) => String(s).slice(0, 120)) : [];
      if (results.length) return { ok: true, provider: "Web search", results, suggestions };
    }
  } catch (_error) {
    // Continue to the stable fallback below.
  }

  const api = new URL("https://en.wikipedia.org/w/api.php");
  api.searchParams.set("action", "query");
  api.searchParams.set("list", "search");
  api.searchParams.set("srsearch", cleanQuery);
  api.searchParams.set("format", "json");
  api.searchParams.set("srlimit", "10");
  const response = await fetch(api, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Search is temporarily unavailable. Please try again.");
  const data = await response.json();
  const hits = Array.isArray(data?.query?.search) ? data.query.search : [];
  const results = hits.map((item: any) => ({
    title: String(item?.title || "Wikipedia article").slice(0, 300),
    url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(String(item?.title || "").replace(/ /g, "_")),
    content: String(item?.snippet || "").replace(/<[^>]*>/g, " ").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").slice(0, 700)
  }));
  return { ok: true, provider: "Wikipedia fallback", results, suggestions: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const requestUrl = new URL(req.url);
    const rawTarget = requestUrl.searchParams.get("url") || "";

    if (req.method === "GET" && requestUrl.searchParams.get("search") === "1") {
      const query = requestUrl.searchParams.get("q") || "";
      if (query.length > 240) return json({ ok: false, error: "Search query is too long." }, 400);
      const results = await searchWeb(query);
      return json(results);
    }

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