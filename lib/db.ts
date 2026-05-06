import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pixelkodePool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return null;
  }

  return new Pool({
    connectionString,
    ssl: connectionString.includes("railway") ? { rejectUnauthorized: false } : undefined
  });
}

export const db = global.__pixelkodePool ?? createPool();

if (process.env.NODE_ENV !== "production" && db) {
  global.__pixelkodePool = db;
}
