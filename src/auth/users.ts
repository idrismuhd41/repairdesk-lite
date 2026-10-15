import db from "../db";

type User = {
  id: number;
  username: string;
  passwordHash: string;
  shopName: string | null;
  createdAt: string;
};

const SELECT_COLUMNS = `
  id,
  username,
  password_hash AS passwordHash,
  shop_name     AS shopName,
  created_at    AS createdAt
`;

function findByUsername(username: string): User | undefined {
  return db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM users
    WHERE username = ?
  `).get(username) as User | undefined;
}

function findById(id: number): User | undefined {
  return db.prepare(`
    SELECT ${SELECT_COLUMNS}
    FROM users
    WHERE id = ?
  `).get(id) as User | undefined;
}

function createUser(
  username: string,
  passwordHash: string,
  shopName: string | null
): User {
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, shop_name)
    VALUES (?, ?, ?)
  `).run(username, passwordHash, shopName);

  const user = findById(Number(result.lastInsertRowid));
  if (!user) {
    throw new Error("Failed to create user");
  }
  return user;
}

export { findByUsername, findById, createUser };
export type { User };