// src/auth/cookies.ts
// Hand-rolled cookie parsing + Set-Cookie serialization.
// Zero dependencies, works in any Node environment.

type CookieOptions = {
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  secure?: boolean;
  path?: string;
  maxAge?: number;        // seconds
  expires?: Date;
};

// Parse a `Cookie:` header string into a key/value object
function parseCookieHeader(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;

  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;

    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();

    if (!name) continue;

    // Cookies may be wrapped in quotes
    let decoded = value;
    if (decoded.startsWith('"') && decoded.endsWith('"')) {
      decoded = decoded.slice(1, -1);
    }

    try {
      result[name] = decodeURIComponent(decoded);
    } catch {
      result[name] = decoded;
    }
  }

  return result;
}

// Serialize a Set-Cookie header value from a name, value, and options object
function serializeSetCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const parts: string[] = [];

  // Base
  parts.push(`${name}=${encodeURIComponent(value)}`);

  // Options
  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }
  if (options.path) {
    parts.push(`Path=${options.path}`);
  }
  if (options.httpOnly) {
    parts.push("HttpOnly");
  }
  if (options.secure) {
    parts.push("Secure");
  }
  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  return parts.join("; ");
}

export { parseCookieHeader, serializeSetCookie };
export type { CookieOptions };