"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Copy, ExternalLink, Link2, MessageCircle, Trash2, Video } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { readMeetHistory, type MeetSessionRecord, writeMeetHistory } from "@/lib/meet-session-store";

type MeetStatus = {
  configured: boolean;
  connected: boolean;
  email: string | null;
};

function formatLocalDateTime(value: string | null) {
  if (!value) return "Instant meeting";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function buildWhatsAppLink(record: MeetSessionRecord) {
  const message = [
    `Meeting: ${record.title}`,
    `Meet link: ${record.meetLink}`,
    record.scheduledAt ? `Time: ${formatLocalDateTime(record.scheduledAt)}` : "Time: Join now"
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function MeetSession() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<MeetStatus>({ configured: false, connected: false, email: null });
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState<MeetSessionRecord[]>([]);
  const [mode, setMode] = useState<"instant" | "scheduled">("instant");
  const [title, setTitle] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    try {
      setHistory(readMeetHistory());
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    writeMeetHistory(history);
  }, [history]);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const incomingError = searchParams.get("error");

    if (connected) {
      setSuccess("Google Meet connected. You can create meetings now.");
    }

    if (incomingError) {
      setError("Google connection did not finish correctly. Check credentials and try again.");
    }
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/google/meet/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load Google Meet status.");
        }

        const payload = (await response.json()) as MeetStatus;
        setStatus(payload);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load status.");
      } finally {
        setIsLoadingStatus(false);
      }
    };

    void run();
  }, []);

  const activeRecord = history[0] ?? null;
  const timezone = useMemo(() => {
    if (!isMounted) return "Asia/Kolkata";
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  }, [isMounted]);

  const createMeeting = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/google/meet/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          attendeeEmail,
          durationMinutes: Number(durationMinutes),
          mode,
          scheduledDate,
          scheduledTime,
          timezone,
          title
        })
      });

      const payload = (await response.json()) as {
        error?: string;
        meeting?: {
          attendeeEmail: string | null;
          calendarLink: string | null;
          hostEmail: string | null;
          meetLink: string;
          scheduledAt: string | null;
        };
      };

      if (!response.ok || !payload.meeting) {
        throw new Error(payload.error ?? "Failed to create meeting.");
      }

      const record: MeetSessionRecord = {
        id: crypto.randomUUID(),
        title: title.trim() || (mode === "instant" ? "Instant Google Meet" : "Scheduled Google Meet"),
        mode,
        attendeeEmail: payload.meeting.attendeeEmail,
        hostEmail: payload.meeting.hostEmail,
        meetLink: payload.meeting.meetLink,
        calendarLink: payload.meeting.calendarLink,
        createdAt: new Date().toISOString(),
        scheduledAt: payload.meeting.scheduledAt
      };

      setHistory((current) => [record, ...current].slice(0, 12));
      setSuccess("Meet link created and displayed below.");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to create meeting.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyLink = async (record: MeetSessionRecord) => {
    await navigator.clipboard.writeText(record.meetLink);
    setCopiedId(record.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const deleteMeeting = (recordId: string) => {
    setHistory((current) => current.filter((record) => record.id !== recordId));
    if (copiedId === recordId) {
      setCopiedId(null);
    }
    setSuccess("Meet session removed from the workspace list.");
  };

  return (
    <div className="space-y-6" suppressHydrationWarning>
      <Card className="overflow-hidden p-0">
        <div className="border-b border-white/70 bg-white/80 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="premium-heading text-2xl font-semibold">Meet Session</h1>
              <p className="mt-1 text-sm text-slate-600">
                Create instant or scheduled Google Meet sessions and keep the shareable link inside the workspace.
              </p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm">
              {isLoadingStatus
                ? "Checking Google status..."
                : status.connected
                  ? `Connected: ${status.email ?? "Google account"}`
                  : status.configured
                    ? "Google not connected"
                    : "Google not configured"}
            </div>
          </div>
        </div>

        <div className="space-y-4 p-5" suppressHydrationWarning>
          {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
          {success ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]" suppressHydrationWarning>
            <div className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-sm space-y-4" suppressHydrationWarning>
              <div className="flex flex-wrap items-center gap-2" suppressHydrationWarning>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("instant")}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    mode === "instant"
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Instant Meet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setMode("scheduled")}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    mode === "scheduled"
                      ? "border-slate-800 bg-slate-800 text-white"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Scheduled Meet
                </Button>
              </div>

              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Meeting title"
                className="h-11 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm text-slate-800"
              />

              <Input
                value={attendeeEmail}
                onChange={(event) => setAttendeeEmail(event.target.value)}
                placeholder="Attendee email"
                className="h-11 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm text-slate-800"
              />

              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  value={durationMinutes}
                  onChange={(event) => setDurationMinutes(event.target.value)}
                  type="number"
                  placeholder="Duration"
                  className="h-11 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm text-slate-800"
                />
                {mode === "scheduled" ? (
                  <>
                    <Input
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      type="date"
                      className="h-11 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm text-slate-800"
                    />
                    <Input
                      value={scheduledTime}
                      onChange={(event) => setScheduledTime(event.target.value)}
                      type="time"
                      className="h-11 rounded-2xl border border-white/80 bg-white/90 px-4 text-sm text-slate-800"
                    />
                  </>
                ) : (
                  <div className="md:col-span-2 flex items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                    Starts immediately using your current time zone: {timezone}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                {status.configured && status.connected ? (
                  <Button onClick={createMeeting} disabled={isSubmitting}>
                    <Video className="mr-2 h-4 w-4" />
                    {isSubmitting ? "Creating..." : "Create Meet Link"}
                  </Button>
                ) : status.configured ? (
                  <Button asChild>
                    <a href="/api/google/auth/start">
                      <Link2 className="mr-2 h-4 w-4" />
                      Connect Google Meet
                    </a>
                  </Button>
                ) : (
                  <Button disabled>
                    <Link2 className="mr-2 h-4 w-4" />
                    Add Google credentials first
                  </Button>
                )}
                <div className="rounded-2xl border border-white/80 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Invite mail is optional. If you add it, Google Calendar sends the meeting invite there.
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-sm" suppressHydrationWarning>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900" suppressHydrationWarning>
                <CalendarClock className="h-4 w-4 text-fuchsia-600" />
                Latest Meet Link
              </div>

              {activeRecord ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{activeRecord.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatLocalDateTime(activeRecord.scheduledAt)}</p>
                    <p className="mt-3 break-all rounded-xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                      {activeRecord.meetLink}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => copyLink(activeRecord)}>
                      <Copy className="mr-2 h-4 w-4" />
                      {copiedId === activeRecord.id ? "Copied" : "Copy link"}
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={activeRecord.meetLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Meet
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={buildWhatsAppLink(activeRecord)} target="_blank" rel="noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Share on WhatsApp
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => deleteMeeting(activeRecord.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  Your generated Meet link will appear here after creation.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[26px] border border-white/80 bg-white/90 p-4 shadow-sm" suppressHydrationWarning>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900" suppressHydrationWarning>
              <Video className="h-4 w-4 text-sky-600" />
              Recent Sessions
            </div>

            <div className="space-y-3">
              {history.length > 0 ? (
                history.map((record) => (
                  <div key={record.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{record.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatLocalDateTime(record.scheduledAt)}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Host: {record.hostEmail ?? "Connected account"}{record.attendeeEmail ? ` | Invite: ${record.attendeeEmail}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyLink(record)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {copiedId === record.id ? "Copied" : "Copy"}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={buildWhatsAppLink(record)} target="_blank" rel="noreferrer">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            WhatsApp
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => deleteMeeting(record.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 break-all rounded-xl bg-white px-3 py-3 text-sm text-slate-700 shadow-sm">
                      {record.meetLink}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  No meetings created yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
