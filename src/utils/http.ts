import type { IncomingMessage, ServerResponse } from "node:http";

type JsonPayload = Record<string, unknown>;
type JsonHandler = (input: JsonPayload) => void;

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

function readJsonBody(
  req: IncomingMessage,
  res: ServerResponse,
  onReady: JsonHandler
): void {
  let body = "";
  let tooLarge = false;

  req.on("data", (chunk: Buffer) => {
    if (tooLarge) return;
    body += chunk;

    if (Buffer.byteLength(body, "utf8") > 10 * 1024) {
      tooLarge = true;
      sendJson(res, 413, {
        success: false,
        message: "Request body is too large"
      });
    }
  });

  req.on("end", () => {
    if (tooLarge || res.writableEnded) return;

    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      sendJson(res, 400, {
        success: false,
        message: "Request body must contain valid JSON"
      });
      return;
    }

    if (
      typeof input !== "object" ||
      input === null ||
      Array.isArray(input)
    ) {
      sendJson(res, 400, {
        success: false,
        message: "Request body must be a JSON object"
      });
      return;
    }

    onReady(input as JsonPayload);
  });
}

export { sendJson, readJsonBody };
export type { JsonPayload, JsonHandler };