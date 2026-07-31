import http from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const preferredPort = Number(process.env.PORT ?? 5175);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function sendFile(response, filePath) {
  response.writeHead(200, {
    "Content-Type": types[extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, safePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    filePath = join(root, "index.html");
  }

  sendFile(response, filePath);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    server.listen(0, "127.0.0.1");
    return;
  }
  throw error;
});

server.listen(preferredPort, "127.0.0.1", () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : preferredPort;
  console.log(`Frontend running at http://127.0.0.1:${port}`);
});
