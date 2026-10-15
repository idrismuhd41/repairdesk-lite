import type { IncomingMessage, ServerResponse } from "node:http";
import { serializeSetCookie } from "../auth/cookies";

import { sendJson, readJsonBody } from "../utils/http";
import type { JsonPayload } from "../utils/http";
import { hashPassword, verifyPassword } from "../auth/hash";
import {
  findByUsername,
  createUser
} from "../auth/users";
import {
  createSession,
  deleteSession
} from "../auth/session";
import {
  readSession,
  getSessionCookieName
} from "../auth/middleware";

const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;
const USERNAME_RE = /^[a-zA-Z0-9_.-]+$/;

// ---------- helpers ----------

function validateUsername(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const u = v.trim().toLowerCase();
  if (u.length < MIN_USERNAME_LENGTH || u.length > MAX_USERNAME_LENGTH) return null;
  if (!USERNAME_RE.test(u)) return null;
  return u;
}

function validatePassword(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (v.length < MIN_PASSWORD_LENGTH) return null;
  return v;
}

function setSessionCookie(
  res: ServerResponse,
  sessionId: string,
  expiresAt: string
): void {
  const isProd = process.env.NODE_ENV === "production";

  const cookieValue = serializeSetCookie(
    getSessionCookieName(),
    sessionId,
    {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProd,
      path: "/",
      expires: new Date(expiresAt)
    }
  );

  res.setHeader("Set-Cookie", cookieValue);
}

function clearSessionCookie(res: ServerResponse): void {
  const isProd = process.env.NODE_ENV === "production";

  const cookieValue = serializeSetCookie(
    getSessionCookieName(),
    "",
    {
      httpOnly: true,
      sameSite: "Lax",
      secure: isProd,
      path: "/",
      expires: new Date(0)
    }
  );

  res.setHeader("Set-Cookie", cookieValue);
}

// ---------- handlers ----------

function signup(req: IncomingMessage, res: ServerResponse): void {
  readJsonBody(req, res, async (input: JsonPayload) => {
    const { username, password, shopName, inviteCode } = input as {
      username?: unknown;
      password?: unknown;
      shopName?: unknown;
      inviteCode?: unknown;
    };

    // Invite code check
    const expectedCode = process.env.INVITE_CODE;
    if (!expectedCode) {
      return sendJson(res, 500, {
        success: false,
        message: "Signup is not configured on this server"
      });
    }

    if (typeof inviteCode !== "string" || inviteCode !== expectedCode) {
      return sendJson(res, 403, {
        success: false,
        message: "Invalid invite code"
      });
    }

    const validUsername = validateUsername(username);
    if (!validUsername) {
      return sendJson(res, 400, {
        success: false,
        message: `Username must be ${MIN_USERNAME_LENGTH}-${MAX_USERNAME_LENGTH} characters (letters, numbers, . _ -)`
      });
    }

    const validPassword = validatePassword(password);
    if (!validPassword) {
      return sendJson(res, 400, {
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      });
    }

    const cleanShopName =
      typeof shopName === "string" && shopName.trim()
        ? shopName.trim().slice(0, 100)
        : null;

    // Check for existing user
    const existing = findByUsername(validUsername);
    if (existing) {
      return sendJson(res, 409, {
        success: false,
        message: "That username is already taken"
      });
    }

    // Create user
    const passwordHash = await hashPassword(validPassword);

    let user;
    try {
      user = createUser(validUsername, passwordHash, cleanShopName);
    } catch {
      return sendJson(res, 500, {
        success: false,
        message: "Failed to create account"
      });
    }

    // Auto-login after signup
    const session = createSession(user.id);
    setSessionCookie(res, session.id, session.expiresAt);

    return sendJson(res, 201, {
      success: true,
      message: "Account created",
      data: {
        id: user.id,
        username: user.username,
        shopName: user.shopName
      }
    });
  });
}

function login(req: IncomingMessage, res: ServerResponse): void {
  readJsonBody(req, res, async (input: JsonPayload) => {
    const { username, password } = input as {
      username?: unknown;
      password?: unknown;
    };

    const validUsername = validateUsername(username);
    if (!validUsername || typeof password !== "string") {
      return sendJson(res, 400, {
        success: false,
        message: "Username and password are required"
      });
    }

    const user = findByUsername(validUsername);

    // Generic error message — do NOT reveal whether the username exists
    const invalidMessage = "Invalid username or password";

    if (!user) {
      // Run a dummy bcrypt to keep timing consistent (prevents user enumeration)
      await verifyPassword("dummy", "$2a$10$" + "0".repeat(53));
      return sendJson(res, 401, {
        success: false,
        message: invalidMessage
      });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return sendJson(res, 401, {
        success: false,
        message: invalidMessage
      });
    }

    const session = createSession(user.id);
    setSessionCookie(res, session.id, session.expiresAt);

    return sendJson(res, 200, {
      success: true,
      message: "Logged in",
      data: {
        id: user.id,
        username: user.username,
        shopName: user.shopName
      }
    });
  });
}

function logout(req: IncomingMessage, res: ServerResponse): void {
  const session = readSession(req);

  if (session) {
    deleteSession(session.id);
  }

  clearSessionCookie(res);

  return sendJson(res, 200, {
    success: true,
    message: "Logged out"
  });
}

function me(req: IncomingMessage, res: ServerResponse): void {
  const session = readSession(req);

  if (!session) {
    return sendJson(res, 401, {
      success: false,
      message: "Not logged in"
    });
  }

  return sendJson(res, 200, {
    success: true,
    data: {
      id: session.userId,
      username: session.username,
      shopName: session.shopName,
      expiresAt: session.expiresAt
    }
  });
}

export { signup, login, logout, me };