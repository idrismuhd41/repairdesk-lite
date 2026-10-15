import crypto from "node:crypto";
import db from "../db";

const SESSION_DAYS = 7;

type Session = {
  id: string;
  userId: number;
  createdAt: string;
  expiresAt: string;
};

type SessionWithUser = Session & {
  username: string;
  shopName: string | null;
};

function createSession(userId: number): Session {
  const id = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(id, userId, expiresAt);

  const session = db.prepare(`
    SELECT
      id,
      user_id    AS userId,
      created_at AS createdAt,
      expires_at AS expiresAt
    FROM sessions
    WHERE id = ?
  `).get(id) as Session | undefined;

  if (!session) {
    throw new Error("Failed to create session");
  }
  return session;
}

function getSession(id: string): SessionWithUser | undefined {
  return db.prepare(`
    SELECT
      s.id,
      s.user_id    AS userId,
      s.created_at AS createdAt,
      s.expires_at AS expiresAt,
      u.username,
      u.shop_name  AS shopName
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
      AND s.expires_at > datetime('now')
  `).get(id) as SessionWithUser | undefined;
}

function deleteSession(id: string): void {
  db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
}

function deleteExpiredSessions(): void {
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
}

export {
  createSession,
  getSession,
  deleteSession,
  deleteExpiredSessions,
  SESSION_DAYS
};
export type { Session, SessionWithUser };