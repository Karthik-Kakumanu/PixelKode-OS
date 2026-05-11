import { cookies } from "next/headers";

const GOOGLE_MEET_TOKEN_COOKIE = "pixelkode_google_meet_tokens";
const GOOGLE_MEET_STATE_COOKIE = "pixelkode_google_meet_state";

const GOOGLE_AUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email"
];

type GoogleMeetTokens = {
  accessToken: string;
  refreshToken?: string;
  expiryDate?: number;
  email?: string;
};

function getGoogleMeetConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI ?? ""
  };
}

export function isGoogleMeetConfigured() {
  const config = getGoogleMeetConfig();
  return Boolean(config.clientId && config.clientSecret && config.redirectUri);
}

export async function createGoogleAuthUrl() {
  const config = getGoogleMeetConfig();
  if (!isGoogleMeetConfigured()) {
    throw new Error("Google Meet integration is not configured.");
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_MEET_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", GOOGLE_AUTH_SCOPES.join(" "));
  url.searchParams.set("state", state);

  return url.toString();
}

async function fetchGoogleUserEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) return undefined;
  const payload = (await response.json()) as { email?: string };
  return payload.email;
}

export async function exchangeGoogleCode(code: string, state: string | null) {
  const config = getGoogleMeetConfig();
  if (!isGoogleMeetConfigured()) {
    throw new Error("Google Meet integration is not configured.");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_MEET_STATE_COOKIE)?.value;

  if (!state || !expectedState || state !== expectedState) {
    throw new Error("Invalid Google OAuth state.");
  }

  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to exchange Google authorization code.");
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const email = await fetchGoogleUserEmail(payload.access_token);
  const tokenData: GoogleMeetTokens = {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiryDate: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined,
    email
  };

  cookieStore.set(GOOGLE_MEET_TOKEN_COOKIE, JSON.stringify(tokenData), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  cookieStore.delete(GOOGLE_MEET_STATE_COOKIE);

  return tokenData;
}

export async function clearGoogleMeetTokens() {
  const cookieStore = await cookies();
  cookieStore.delete(GOOGLE_MEET_TOKEN_COOKIE);
  cookieStore.delete(GOOGLE_MEET_STATE_COOKIE);
}

async function readGoogleMeetTokens() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GOOGLE_MEET_TOKEN_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as GoogleMeetTokens;
  } catch {
    return null;
  }
}

async function writeGoogleMeetTokens(tokens: GoogleMeetTokens) {
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_MEET_TOKEN_COOKIE, JSON.stringify(tokens), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleMeetConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token.");
  }

  const payload = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    expiryDate: payload.expires_in ? Date.now() + payload.expires_in * 1000 : undefined
  };
}

export async function getValidGoogleAccessToken() {
  const tokens = await readGoogleMeetTokens();
  if (!tokens) {
    throw new Error("Google Meet is not connected.");
  }

  const isFresh = Boolean(tokens.accessToken && tokens.expiryDate && tokens.expiryDate - Date.now() > 60_000);
  if (isFresh) {
    return tokens;
  }

  if (!tokens.refreshToken) {
    throw new Error("Google Meet session expired. Please reconnect.");
  }

  const refreshed = await refreshGoogleAccessToken(tokens.refreshToken);
  const nextTokens: GoogleMeetTokens = {
    ...tokens,
    accessToken: refreshed.accessToken,
    expiryDate: refreshed.expiryDate
  };

  if (!nextTokens.email) {
    nextTokens.email = await fetchGoogleUserEmail(nextTokens.accessToken);
  }

  await writeGoogleMeetTokens(nextTokens);
  return nextTokens;
}

export async function getGoogleMeetConnectionStatus() {
  const configured = isGoogleMeetConfigured();
  if (!configured) {
    return { configured: false, connected: false, email: null as string | null };
  }

  const tokens = await readGoogleMeetTokens();
  return {
    configured: true,
    connected: Boolean(tokens?.accessToken || tokens?.refreshToken),
    email: tokens?.email ?? null
  };
}

type CreateMeetArgs = {
  attendeeEmail?: string;
  durationMinutes: number;
  isInstant: boolean;
  scheduledAt?: string;
  timezone: string;
  title: string;
};

function addMinutesIso(isoString: string, minutes: number) {
  const date = new Date(isoString);
  return new Date(date.getTime() + minutes * 60_000).toISOString();
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(lookup.year),
    Number(lookup.month) - 1,
    Number(lookup.day),
    Number(lookup.hour),
    Number(lookup.minute),
    Number(lookup.second)
  );

  return asUtc - date.getTime();
}

function convertZonedLocalDateTimeToIso(localDateTime: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localDateTime);
  if (!match) {
    throw new Error("Invalid scheduled date and time.");
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const initialUtcGuess = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  );
  const initialOffset = getTimeZoneOffsetMilliseconds(initialUtcGuess, timeZone);
  let resolved = new Date(initialUtcGuess.getTime() - initialOffset);
  const correctedOffset = getTimeZoneOffsetMilliseconds(resolved, timeZone);

  if (correctedOffset !== initialOffset) {
    resolved = new Date(initialUtcGuess.getTime() - correctedOffset);
  }

  return resolved.toISOString();
}

async function pollEventForMeetLink(accessToken: string, eventId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      cache: "no-store"
    });

    if (response.ok) {
      const event = (await response.json()) as Record<string, unknown>;
      const conferenceData = event.conferenceData as { entryPoints?: Array<{ uri?: string }> } | undefined;
      const meetUri =
        typeof event.hangoutLink === "string"
          ? event.hangoutLink
          : conferenceData?.entryPoints?.find((entry) => typeof entry.uri === "string")?.uri;

      if (meetUri) {
        return { event, meetUri };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Google created the event, but the Meet link was not ready yet. Please try again.");
}

export async function createGoogleMeetEvent({
  attendeeEmail,
  durationMinutes,
  isInstant,
  scheduledAt,
  timezone,
  title
}: CreateMeetArgs) {
  const tokens = await getValidGoogleAccessToken();
  const startDateTime = isInstant
    ? new Date().toISOString()
    : scheduledAt
      ? convertZonedLocalDateTimeToIso(scheduledAt, timezone)
      : undefined;

  if (!startDateTime) {
    throw new Error("Scheduled date and time are required.");
  }

  const payload = {
    summary: title,
    start: {
      dateTime: startDateTime,
      timeZone: timezone
    },
    end: {
      dateTime: addMinutesIso(startDateTime, durationMinutes),
      timeZone: timezone
    },
    attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: {
          type: "hangoutsMeet"
        }
      }
    }
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Meet creation failed: ${errorText}`);
  }

  const event = (await response.json()) as { id?: string; htmlLink?: string };
  if (!event.id) {
    throw new Error("Google Calendar did not return an event ID.");
  }

  const linked = await pollEventForMeetLink(tokens.accessToken, event.id);
  return {
    hostEmail: tokens.email ?? null,
    attendeeEmail: attendeeEmail ?? null,
    meetLink: linked.meetUri,
    calendarLink: typeof linked.event.htmlLink === "string" ? linked.event.htmlLink : null,
    scheduledAt: isInstant ? null : startDateTime
  };
}
