#!/usr/bin/env node
// Static server for the sandbox dashboard. Local only; no write endpoints.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("sandbox");
const PORT = Number(process.env.SANDBOX_PORT || 8792);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rel = url.pathname === "/" ? "dashboard.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(ROOT, rel);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, "dashboard.html")) {
    res.writeHead(403).end("forbidden");
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("not found"); return; }
    res.writeHead(200, {
      "content-type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
    });
    res.end(buf);
  });
}).listen(PORT, "127.0.0.1", () => {
  console.log(`sandbox dashboard: http://127.0.0.1:${PORT}`);
  console.log("SIMULATION ONLY — no mainnet, no real funds");
});
