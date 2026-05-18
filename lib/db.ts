import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pixelkodePool: Pool | undefined;
}

function resolveSslConfig(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
    const host = parsed.hostname.toLowerCase();
    const isLocalHost = ["localhost", "127.0.0.1", "::1"].includes(host);

    if (sslMode === "disable" || isLocalHost) {
      return undefined;
    }

    if (sslMode === "verify-full") {
      return {};
    }

    if (sslMode === "require" || sslMode === "prefer" || sslMode === "allow" || sslMode === "no-verify") {
      return { rejectUnauthorized: false };
    }

    if (process.env.NODE_ENV === "production") {
      return { rejectUnauthorized: false };
    }
  } catch {
    if (process.env.NODE_ENV === "production") {
      return { rejectUnauthorized: false };
    }
  }

  return undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    ssl: resolveSslConfig(connectionString)
  });
}

export const db = global.__pixelkodePool ?? createPool();

if (process.env.NODE_ENV !== "production" && db) {
  global.__pixelkodePool = db;
}
