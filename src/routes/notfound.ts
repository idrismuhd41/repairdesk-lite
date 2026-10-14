import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../utils/http";

function handleNotFound(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 404, {
    success: false,
    message: "Route not found"
  });
}

export { handleNotFound };