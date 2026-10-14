import type { IncomingMessage, ServerResponse } from "node:http";
import { sendJson } from "../utils/http";

function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, {
    success: true,
    message: "RepairDesk API is running smoothly"
  });
}

export { handleHealth };