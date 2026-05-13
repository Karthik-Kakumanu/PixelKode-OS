import type { SheetData, SheetKey } from "@/lib/types";

export type BackupSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  trigger: "auto" | "manual";
  sheets: Record<SheetKey, SheetData>;
};

export const BACKUP_STORAGE_KEY = "pixelkode_os_restore_points";
const MAX_BACKUPS = 48;
const AUTO_BACKUP_INTERVAL_MS = 60 * 60 * 1000;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cloneSheets(sheets: Record<SheetKey, SheetData>) {
  return JSON.parse(JSON.stringify(sheets)) as Record<SheetKey, SheetData>;
}

function createBackupId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function readBackups() {
  if (!canUseStorage()) return [] as BackupSnapshot[];

  try {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is BackupSnapshot => {
        if (!item || typeof item !== "object") return false;
        const candidate = item as Partial<BackupSnapshot>;
        return typeof candidate.id === "string" && typeof candidate.createdAt === "string" && typeof candidate.label === "string";
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  } catch {
    return [];
  }
}

export function writeBackups(backups: BackupSnapshot[]) {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
  } catch {
    // Ignore storage write issues and keep the live workspace responsive.
  }
}

export function createBackupSnapshot(
  sheets: Record<SheetKey, SheetData>,
  label: string,
  trigger: BackupSnapshot["trigger"]
) {
  const backup: BackupSnapshot = {
    id: createBackupId(),
    createdAt: new Date().toISOString(),
    label,
    trigger,
    sheets: cloneSheets(sheets)
  };

  const nextBackups = [backup, ...readBackups()].slice(0, MAX_BACKUPS);
  writeBackups(nextBackups);
  return nextBackups;
}

export function maybeCreateAutoBackup(sheets: Record<SheetKey, SheetData>) {
  const backups = readBackups();
  const latest = backups[0];

  if (latest) {
    const latestTime = new Date(latest.createdAt).getTime();
    if (Date.now() - latestTime < AUTO_BACKUP_INTERVAL_MS) {
      return backups;
    }
  }

  return createBackupSnapshot(sheets, "Automatic hourly restore point", "auto");
}

