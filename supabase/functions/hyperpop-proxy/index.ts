const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8"
};

const MAX_URL_LENGTH = 2048;
const MAX_HTML_SIZE = 2 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT = 12000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function blockedHostname(hostname: string) {
  const h = hostname.toLowerCase().replace(/\\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal" || h === "metadata.google" || h === "host.docker.internal") return true;
  if (/^\\d+(\\.\\d+){3}$/.test(h)) {
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

async function fetchPage(start: URL) {
  let current = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    try {
      const response = await fetch(current, {
        method: "GET", redirect: "manual", signal: controller.signal,
        headers: { "User-Agent": "Hyper-Pop-Web-Proxy/1.0", "Accept": "text/html,application/xhtml+xml" }
      });
      if ([301,302,303,307,308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect has no destination.");
        current = validateUrl(new URL(location, current).toString());
        continue;
      }
      return { response, url: current };
    } finally { clearTimeout(timer); }
  }
  throw new Error("Too many redirects.");
}

function sanitizeHtml(html: string, baseUrl: URL) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) throw new Error("The target returned invalid HTML.");
  for (const selector of ["script","iframe","object","embed","applet","base","meta[http-equiv=" + String.fromCharCode(39) + "refresh" + String.fromCharCode(39) + "]","noscript"]) {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  }
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc") el.removeAttribute(attr.name);
    }
    for (const attrName of ["href","action"]) {
      const raw = el.getAttribute(attrName);
      if (!raw) continue;
      try {
        const absolute = new URL(raw, baseUrl);
        if (!["http:","https:"].includes(absolute.protocol)) { el.removeAttribute(attrName); continue; }
        el.setAttribute(attrName, "/proxy.html?url=" + encodeURIComponent(absolute.toString()));
      } catch { el.removeAttribute(attrName); }
    }
  });
  return "<!doctype html>\\n" + doc.documentElement.outerHTML;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok:false, error:"POST required." }, 405);
  try {
    const body = await req.json();
    const target = validateUrl(String(body?.url || "").trim());
    const { response, url } = await fetchPage(target);
    if (!response.ok) return json({ ok:false, error:"Target returned HTTP " + response.status + "." }, 502);
    const type = response.headers.get("content-type") || "";
    if (!type.toLowerCase().includes("text/html") && !type.toLowerCase().includes("application/xhtml+xml")) return json({ ok:false, error:"This proxy currently supports HTML pages only." }, 415);
    const length = Number(response.headers.get("content-length") || "0");
    if (length > MAX_HTML_SIZE) return json({ ok:false, error:"The page is too large." }, 413);
    const html = await response.text();
    if (new TextEncoder().encode(html).byteLength > MAX_HTML_SIZE) return json({ ok:false, error:"The page is too large." }, 413);
    return json({ ok:true, url:url.toString(), status:response.status, html:sanitizeHtml(html, url) });
  } catch (error) {
    return json({ ok:false, error:error instanceof Error ? error.message : "Proxy request failed." }, 400);
  }
});