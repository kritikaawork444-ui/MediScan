/**
 * Production static server + /api proxy for Arena/e2b live preview.
 * Avoids Vite HMR/WebSocket issues that leave the iframe on "Loading…".
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT || 5173);
const API = process.env.API_URL || "http://127.0.0.1:8000";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Cache-Control": "no-cache",
    // Allow embedding in Arena live preview iframe
    "Content-Security-Policy": "frame-ancestors *",
    ...headers,
  });
  res.end(body);
}

function proxyApi(req, res) {
  const target = new URL(req.url, API);
  const opts = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, host: target.host },
  };
  const upstream = http.request(opts, (up) => {
    const headers = { ...up.headers };
    // Don't let API force download / block iframe
    delete headers["x-frame-options"];
    delete headers["content-security-policy"];
    res.writeHead(up.statusCode || 502, headers);
    up.pipe(res);
  });
  upstream.on("error", (err) => {
    send(res, 502, JSON.stringify({ detail: "API proxy error", error: String(err.message) }), {
      "Content-Type": "application/json",
    });
  });
  req.pipe(upstream);
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || "/").split("?")[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

const server = http.createServer((req, res) => {
  const url = req.url || "/";

  if (url.startsWith("/api")) {
    return proxyApi(req, res);
  }

  let filePath = safeJoin(DIST, url === "/" ? "/index.html" : url);
  if (!filePath) return send(res, 400, "Bad path");

  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        // SPA fallback
        fs.readFile(path.join(DIST, "index.html"), (e2, html) => {
          if (e2) return send(res, 404, "Not found");
          return send(res, 200, html, { "Content-Type": "text/html; charset=utf-8" });
        });
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      send(res, 200, data, { "Content-Type": MIME[ext] || "application/octet-stream" });
    });
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MediScan static UI on http://0.0.0.0:${PORT} (dist + /api → ${API})`);
});
