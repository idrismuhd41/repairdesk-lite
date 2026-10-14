import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

import { handleHealth } from "./routes/health";
import {
  listRepairs,
  createRepair,
  getRepair,
  updateRepair,
  deleteRepair
} from "./routes/repairs";
import { handleNotFound } from "./routes/notfound";

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

function serveStatic(res: ServerResponse, filePath: string, contentType: string): void {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const { method, url } = req;

  // ---------- Static frontend ----------
  if (method === "GET" && (url === "/" || url === "/index.html")) {
    return serveStatic(
      res,
      path.join(PUBLIC_DIR, "index.html"),
      "text/html; charset=utf-8"
    );
  }

  // ---------- JSON API ----------
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (method === "GET" && url === "/health") {
    return handleHealth(req, res);
  }

  if (url === "/api/repairs") {
    if (method === "GET") return listRepairs(req, res);
    if (method === "POST") return createRepair(req, res);
  }

  const match = url?.match(/^\/api\/repairs\/(\d+)$/);
  if (match) {
    const id = Number(match[1]);
    if (method === "GET")    return getRepair(req, res, id);
    if (method === "PATCH")  return updateRepair(req, res, id);
    if (method === "DELETE") return deleteRepair(req, res, id);
  }

  return handleNotFound(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`RepairDesk API: http://127.0.0.1:${PORT}`);
  console.log(`Frontend:       http://127.0.0.1:${PORT}/`);
});