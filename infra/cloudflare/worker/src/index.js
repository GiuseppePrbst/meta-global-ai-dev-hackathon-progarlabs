// Reverse proxy: api-bosquevivo.progarlabs.com → Cloud Run (bosque-vivo-api).
//
// - Fixed origin from ORIGIN_URL: the client chooses only path and query, never the host
//   (no open proxy, no SSRF).
// - Adds X-Bosque-Origin (secret) so the public run.app URL alone is useless.
// - Adds X-Bosque-Visitor-Country and X-Bosque-Visitor-IP from Cloudflare's own data. Cloudflare
//   strips CF-IPCountry on subrequests to origins it does not proxy, such as run.app. Client
//   values are always removed first; an absent value stays absent and the backend refuses.
// - Bodies (images, audio) are streamed through, never logged, stored or cached.
// - WebSocket upgrades (/guide/voice/stream) pass through unchanged.
const HOST = "api-bosquevivo.progarlabs.com";
const HOP_BY_HOP = ["connection", "keep-alive", "proxy-authorization", "te", "trailer", "transfer-encoding"];
const VISITOR_COUNTRY = "X-Bosque-Visitor-Country";
const VISITOR_IP = "X-Bosque-Visitor-IP";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== HOST) return new Response("Not found", { status: 404 });
    const origin = new URL(env.ORIGIN_URL);
    const upstream = new URL(url.pathname + url.search, origin);
    if (upstream.origin !== origin.origin) return new Response("Bad request", { status: 400 });

    const visitorIp = request.headers.get("CF-Connecting-IP");
    const headers = new Headers(request.headers);
    for (const name of HOP_BY_HOP) headers.delete(name);
    headers.delete("host");
    headers.delete(VISITOR_COUNTRY);
    headers.delete(VISITOR_IP);
    if (request.cf?.country) headers.set(VISITOR_COUNTRY, request.cf.country);
    if (visitorIp) headers.set(VISITOR_IP, visitorIp);
    headers.set("X-Bosque-Origin", env.ORIGIN_AUTH_TOKEN);
    headers.set("X-Forwarded-Host", HOST);

    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      redirect: "manual",
    });
    if (response.status === 101) return response; // WebSocket handshake
    const out = new Response(response.body, response);
    if (!out.headers.has("Cache-Control")) out.headers.set("Cache-Control", "no-store");
    return out;
  },
};
