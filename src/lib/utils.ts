import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date / Time helpers ────────────────────────────────────────────────────

/** "2026-06-24" from a Date */
export function toDateKey(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Today's date key in local time */
export function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "Jun 24, 2026" */
export function formatDate(date: Date | string | undefined | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "9:05 AM" */
export function formatTime(date: Date | string | undefined | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "9:05 AM · Jun 24" */
export function formatDateTime(date: Date | string | undefined | null): string {
  if (!date) return "—";
  return `${formatTime(date)} · ${formatDate(date)}`;
}

/** 95 → "1h 35m" */
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ─── Geo helpers ─────────────────────────────────────────────────────────────

/** Haversine distance in kilometres between two lat/lng points */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── ID / string helpers ─────────────────────────────────────────────────────

/** Cryptographically random hex ID */
export function generateId(bytes = 16): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("crypto").randomBytes(bytes).toString("hex");
}

/** "john.doe@example.com" → "jo****@example.com" */
export function maskString(str: string, visibleChars = 2): string {
  if (!str) return "";
  const [local, domain] = str.split("@");
  if (!domain) {
    return str.slice(0, visibleChars) + "****" + str.slice(-1);
  }
  return local.slice(0, visibleChars) + "****@" + domain;
}
