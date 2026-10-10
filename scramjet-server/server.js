import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("./public/", import.meta.url));
logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  hostname_blacklist: [/example\\.com/i],
  dns_servers: ["1.1.1.3", "1.0.0.3"]
});

const app = Fastify({
  logger: false,
  serverFactory: (handler) => createServer()
    .on("request", (req, res) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
      handler(req, res);
    })
    .on("upgrade", (req, socket, head) => {
      if (req.url?.startsWith("/wisp/")) wisp.routeRequest(req, socket, head);
      else socket.end();
    })
});
app.get("/health", async () => ({ ok: true, service: "hyper-pop-scramjet" }));
app.register(fastifyStatic, { root: publicPath, decorateReply: true });
app.register(fastifyStatic, { root: scramjetPath, prefix: "/scram/", decorateReply: false });
app.register(fastifyStatic, { root: libcurlPath, prefix: "/libcurl/", decorateReply: false });
app.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
app.setNotFoundHandler((request, reply) => reply.code(404).type("text/plain").send("Not found"));

const port = Number.parseInt(process.env.PORT || "8080", 10);
await app.listen({ port, host: "0.0.0.0" });
