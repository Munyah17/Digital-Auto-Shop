const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const API_PORT = 3000;
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function proxyApi(req, res) {
  const proxyReq = http.request(
    { host: "localhost", port: API_PORT, path: req.url, method: req.method, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", () => {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Vendor API offline — run: node backend/server.js" }));
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) return proxyApi(req, res);

  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(root, path.normalize(urlPath));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}).listen(8080, () => console.log("Serving site + /api proxy on http://localhost:8080"));
