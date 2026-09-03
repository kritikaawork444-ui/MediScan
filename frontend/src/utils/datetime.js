/**
 * History timestamps are stored/sent as UTC.
 * Older API rows sometimes omitted the "Z", so browsers treated them as local
 * time and showed the wrong clock (often ~5.5h off in India).
 */

export function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  let s = String(value).trim();
  if (!s) return null;

  // "2026-09-02 16:51:55" -> "2026-09-02T16:51:55"
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");

  // Bare ISO without timezone → treat as UTC
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasZone) s = `${s}Z`;

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatHistoryTime(value) {
  const d = parseApiDate(value);
  if (!d) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatHistoryDateLabel(value) {
  const d = parseApiDate(value);
  if (!d) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDate(value) {
  const d = parseApiDate(value);
  if (!d) return "";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

export function formatDateTime(value) {
  const d = parseApiDate(value);
  if (!d) return "";
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
