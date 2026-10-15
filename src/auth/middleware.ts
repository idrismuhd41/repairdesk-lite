import type { IncomingMessage, ServerResponse } from "node:http";
import { parseCookieHeader } from "./cookies";
import { getSession } from "./session";
import type { SessionWithUser } from "./session";
import { sendJson } from "../utils/http";

const COOKIE_NAME = "sid";

type AuthedRequest = IncomingMessage & {
  session?: SessionWithUser;
};

function readSession(req: IncomingMessage): SessionWithUser | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookies = parseCookieHeader(cookieHeader);
  const sid = cookies[COOKIE_NAME];
  if (!sid) return undefined;

  return getSession(sid);
}

function requireAuth(
  req: IncomingMessage,
  res: ServerResponse
): SessionWithUser | undefined {
  const session = readSession(req);

  if (!session) {
    sendJson(res, 401, {
      success: false,
      message: "Authentication required"
    });
    return undefined;
  }

  (req as AuthedRequest).session = session;
  return session;
}

function getSessionCookieName(): string {
  return COOKIE_NAME;
}

export { readSession, requireAuth, getSessionCookieName };
export type { AuthedRequest };