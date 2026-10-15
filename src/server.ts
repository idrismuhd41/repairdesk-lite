import http from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";

// Load .env in development
import dotenv from "dotenv";
dotenv.config();

import { handleHealth } from "./routes/health";
import {
  listRepairs,
  createRepair,
  getRepair,
  updateRepair,
  deleteRepair
} from "./routes/repairs";
import { handleNotFound } from "./routes/notfound";
import { signup, login, logout, me } from "./routes/auth";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";
const PUBLIC_DIR = path.join(__dirname, "..", "public");

// ---------- static file serving ----------

const STATIC_FILES: Record<string, string> = {
  "/":             "index.html",
  "/index.html":   "index.html",
  "/login.html":   "login.html"
};

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

// ---------- server ----------

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  const { method, url } = req;

  // ---------- Static frontend ----------
  if (method === "GET" && url && STATIC_FILES[url]) {
    return serveStatic(
      res,
      path.join(PUBLIC_DIR, STATIC_FILES[url]),
      "text/html; charset=utf-8"
    );
  }

  // ---------- JSON API ----------
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // Auth routes (public)
  if (method === "POST" && url === "/api/auth/signup") {
    return signup(req, res);
  }
  if (method === "POST" && url === "/api/auth/login") {
    return login(req, res);
  }
  if (method === "POST" && url === "/api/auth/logout") {
    return logout(req, res);
  }
  if (method === "GET" && url === "/api/auth/me") {
    return me(req, res);
  }

  // Health (public)
  if (method === "GET" && url === "/health") {
    return handleHealth(req, res);
  }

  // Repairs (protected — requireAuth inside each handler)
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

server.listen(PORT, HOST, () => {
  console.log(`RepairDesk API: http://${HOST}:${PORT}`);
  console.log(`Frontend:       http://${HOST}:${PORT}/`);
});