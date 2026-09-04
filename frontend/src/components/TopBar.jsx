import { useEffect, useRef, useState } from "react";
import { Bell, ChevronLeft, User, X, CheckCheck, Trash2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProfile } from "../utils/profile.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  dismissNotification,
  ensureWelcomeNotification,
} from "../utils/notifications.js";

function timeAgo(ts, t) {
  if (!ts) return "";
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 45) return t("justNow");
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

export default function TopBar({ showBack = false, title }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const profile = getProfile();
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(() => getNotifications());
  const [unread, setUnread] = useState(() => getUnreadCount());

  const initials =
    profile.name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "";

  const refresh = () => {
    setItems(getNotifications());
    setUnread(getUnreadCount());
  };

  useEffect(() => {
    ensureWelcomeNotification(t);
    refresh();
    const onNotif = () => refresh();
    window.addEventListener("mediscan:notifications", onNotif);
    window.addEventListener("storage", onNotif);
    return () => {
      window.removeEventListener("mediscan:notifications", onNotif);
      window.removeEventListener("storage", onNotif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n) => {
    markNotificationRead(n.id);
    refresh();
    if (n.href) {
      setOpen(false);
      navigate(n.href);
    }
  };

  return (
    <div className="flex items-center justify-between px-5 pt-6 pb-4">
      <div className="flex items-center gap-2 min-w-0">
        {showBack && (
          <button type="button" onClick={() => navigate(-1)} className="text-ink mr-1" aria-label={t("goBack")}>
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="md:hidden min-w-0">
          <h1 className="text-lg font-bold bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent">
            {title || t("appName")}
          </h1>
          <p className="text-[11px] text-muted -mt-1">{t("appTagline")}</p>
        </div>
        {title && <h1 className="hidden md:block text-base font-bold text-ink truncate">{title}</h1>}
      </div>

      <div className="flex items-center gap-3 relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={`relative text-ink/70 hover:text-accent transition-colors ${open ? "text-accent" : ""}`}
          aria-label={t("notifications")}
          aria-expanded={open}
        >
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[0.9rem] h-[0.9rem] px-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-panel flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(20rem,calc(100vw-1.5rem))] rounded-xl2 bg-white border border-border shadow-float overflow-hidden z-50 animate-fade-slide-up">
            <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border bg-panel2/60">
              <p className="text-sm font-bold text-ink">{t("notifications")}</p>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        markAllNotificationsRead();
                        refresh();
                      }}
                      className="text-[10px] font-bold text-accent2 px-1.5 py-1 rounded-lg hover:bg-white inline-flex items-center gap-1"
                      title={t("markAllRead")}
                    >
                      <CheckCheck size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearNotifications();
                        refresh();
                      }}
                      className="text-[10px] font-bold text-red-600 px-1.5 py-1 rounded-lg hover:bg-white"
                      title={t("clearAll")}
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-white hover:text-ink"
                  aria-label={t("close")}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {items.length === 0 ? (
                <div className="p-5 text-center">
                  <p className="text-xs font-semibold text-muted">{t("noNotifications")}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((n) => (
                    <li key={n.id} className={`px-3 py-2.5 ${n.read ? "opacity-80" : "bg-sky-50/50"}`}>
                      <div className="flex gap-2">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-slate-300" : "bg-red-500"}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-ink leading-snug">{n.title}</p>
                            <span className="text-[9px] font-semibold text-muted shrink-0">
                              {timeAgo(n.createdAt, t)}
                            </span>
                          </div>
                          {n.body && <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{n.body}</p>}
                          <div className="flex items-center gap-2 mt-1">
                            {n.href && (
                              <button
                                type="button"
                                onClick={() => openItem(n)}
                                className="text-[10px] font-bold text-accent2 inline-flex items-center gap-1 hover:underline"
                              >
                                <ExternalLink size={11} />
                                {t("open")}
                              </button>
                            )}
                            {!n.read && (
                              <button
                                type="button"
                                onClick={() => {
                                  markNotificationRead(n.id);
                                  refresh();
                                }}
                                className="text-[10px] font-bold text-muted hover:text-ink"
                              >
                                {t("markAllRead")}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                dismissNotification(n.id);
                                refresh();
                              }}
                              className="text-[10px] font-bold text-red-500 hover:underline ml-auto"
                            >
                              {t("dismiss")}
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white text-xs font-bold shrink-0"
          aria-label={t("profile")}
        >
          {initials || <User size={15} />}
        </button>
      </div>
    </div>
  );
}
