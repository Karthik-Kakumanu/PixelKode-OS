export type MeetSessionRecord = {
  id: string;
  title: string;
  mode: "instant" | "scheduled";
  attendeeEmail: string | null;
  hostEmail: string | null;
  meetLink: string;
  calendarLink: string | null;
  createdAt: string;
  scheduledAt: string | null;
};

export const MEET_HISTORY_KEY = "pixelkode_google_meet_history";

export function readMeetHistory() {
  if (typeof window === "undefined") return [] as MeetSessionRecord[];

  try {
    const raw = window.localStorage.getItem(MEET_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as MeetSessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function writeMeetHistory(history: MeetSessionRecord[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(MEET_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage failures for non-critical meeting history persistence.
  }
}
