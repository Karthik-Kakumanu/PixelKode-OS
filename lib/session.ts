import { cookies } from "next/headers";

const SESSION_KEY = "pixelkode_session";

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_KEY)?.value === "active";
}

export async function createSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_KEY, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_KEY);
}

export function getLoginCredentials() {
  return {
    username: process.env.APP_USERNAME ?? "admin",
    password: process.env.APP_PASSWORD ?? "pixelkode123"
  };
}
