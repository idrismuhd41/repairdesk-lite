import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { sendJson } from "../utils/http";

const PUBLIC_DIR = path.join(__dirname, "..", "..", "public");

function handleNotFound(req: IncomingMessage, res: ServerResponse): void {
  const accept = req.headers.accept || "";

  // If the client prefers HTML (browser), serve the 404 page
  if (accept.includes("text/html")) {
    const filePath = path.join(PUBLIC_DIR, "404.html");
    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Fallback to plain text if the 404 page is missing
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 — Page not found");
        return;
      }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    });
    return;
  }

  // Otherwise (API clients, curl, fetch), return JSON
  sendJson(res, 404, {
    success: false,
    message: "Route not found"
  });
}

export { handleNotFound };