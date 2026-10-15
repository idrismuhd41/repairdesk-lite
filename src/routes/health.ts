import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import db from "../db";
import { sendJson } from "../utils/http";

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");
const STARTED_AT = Date.now();

function buildHealthPayload(): {
  statusCode: number;
  payload: {
    success: boolean;
    message: string;
    uptime: number;
    timestamp: string;
    env: string;
    checks: {
      database: string;
      activeSessions: number;
    };
  };
} {
  let databaseStatus = "ok";
  let sessionCount = 0;

  try {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM sessions`).get() as { n: number };
    sessionCount = row.n;
  } catch {
    databaseStatus = "error";
  }

  const healthy = databaseStatus === "ok";

  return {
    statusCode: healthy ? 200 : 503,
    payload: {
      success: healthy,
      message: healthy
        ? "RepairDesk API is running smoothly"
        : "RepairDesk API is degraded",
      uptime: Math.floor((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || "development",
      checks: {
        database: databaseStatus,
        activeSessions: sessionCount
      }
    }
  };
}

function handleHealth(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader("Cache-Control", "no-store");

  const accept = req.headers.accept || "";

  // Browser → serve the HTML health page
  if (accept.includes("text/html")) {
    const filePath = path.join(PUBLIC_DIR, "health.html");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Fallback to JSON if the HTML file is missing
        const { statusCode, payload } = buildHealthPayload();
        sendJson(res, statusCode, payload);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // API client → return JSON
  const { statusCode, payload } = buildHealthPayload();
  sendJson(res, statusCode, payload);
}

export { handleHealth };