const STORAGE_KEY = "mediscan_notifications_v1";
const WELCOME_FLAG = "mediscan_notif_welcome";

function uid() {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent("mediscan:notifications"));
  } catch {
    /* ignore */
  }
}

export function getNotifications() {
  return readAll().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function getUnreadCount() {
  return getNotifications().filter((n) => !n.read).length;
}

export function addNotification({ title, body, type = "info", href = null }) {
  const list = readAll();
  const item = {
    id: uid(),
    title: title || "MediScan",
    body: body || "",
    type,
    href,
    read: false,
    createdAt: Date.now(),
  };
  list.unshift(item);
  writeAll(list);
  return item;
}

export function markNotificationRead(id) {
  const list = readAll().map((n) => (n.id === id ? { ...n, read: true } : n));
  writeAll(list);
}

export function markAllNotificationsRead() {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

export function clearNotifications() {
  writeAll([]);
}

export function dismissNotification(id) {
  writeAll(readAll().filter((n) => n.id !== id));
}

/** Seed a one-time welcome notification so the bell is never a dead control. */
export function ensureWelcomeNotification(t) {
  try {
    if (localStorage.getItem(WELCOME_FLAG)) return;
    localStorage.setItem(WELCOME_FLAG, "1");
  } catch {
    return;
  }
  addNotification({
    title: t ? t("notifWelcomeTitle") : "Welcome to MediScan",
    body: t ? t("notifWelcomeBody") : "Check symptoms, scan reports, or book a free doctor consult.",
    type: "welcome",
    href: "/ai-checker",
  });
  addNotification({
    title: t ? t("notifTipTitle") : "Health tip",
    body: "Drink water regularly and rest well — small habits protect long-term health.",
    type: "tip",
    href: "/",
  });
}
