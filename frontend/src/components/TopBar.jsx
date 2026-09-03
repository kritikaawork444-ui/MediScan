import { useEffect, useRef, useState } from "react";
import { Bell, ChevronLeft, Heart, User, X, CheckCheck, Trash2, ExternalLink } from "lucide-react";
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
    <div className="sticky top-0 z-20 px-4 pt-3 pb-2 md:px-6">
      <div className="flex items-center justify-between gap-3 rounded-2xl glass-panel px-3.5 py-2.5 shadow-soft">
        <div className="flex items-center gap-2 min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl bg-panel2/80 border border-border flex items-center justify-center text-ink hover:bg-white hover:border-accent/40 transition shrink-0"
              aria-label={t("goBack")}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="md:hidden flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow shrink-0">
              <Heart size={14} className="text-white" fill="white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-extrabold leading-tight tracking-tight bg-gradient-to-r from-accent2 via-accent to-teal-400 bg-clip-text text-transparent">
                {title || t("appName")}
              </h1>
              <p className="text-[10px] text-muted font-medium -mt-0.5">{t("appTagline")}</p>
            </div>
          </div>
          {title && (
            <h1 className="hidden md:block text-base font-bold text-ink truncate">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-2 relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition ${
              open
                ? "bg-accent/10 border-accent text-accent2"
                : "bg-panel2/80 border-border text-ink/70 hover:text-accent hover:border-accent/40 hover:bg-white"
            }`}
            aria-label={t("notifications")}
            aria-expanded={open}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.05rem] h-[1.05rem] px-0.5 bg-rose-500 text-white text-[9px] font-extrabold rounded-full ring-2 ring-white flex items-center justify-center animate-pulse">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl bg-white border border-border shadow-float overflow-hidden z-50 animate-fade-slide-up">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border bg-panel2/50">
                <p className="text-sm font-extrabold text-ink">{t("notifications")}</p>
                <div className="flex items-center gap-1">
                  {items.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          markAllNotificationsRead();
                          refresh();
                        }}
                        className="text-[10px] font-bold text-accent2 px-2 py-1 rounded-lg hover:bg-white inline-flex items-center gap-1"
                        title={t("markAllRead")}
                      >
                        <CheckCheck size={12} />
                        {t("markAllRead")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearNotifications();
                          refresh();
                        }}
                        className="text-[10px] font-bold text-rose-600 px-2 py-1 rounded-lg hover:bg-white inline-flex items-center gap-1"
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

              <div className="max-h-80 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-panel2 mx-auto flex items-center justify-center text-muted mb-2">
                      <Bell size={20} />
                    </div>
                    <p className="text-xs font-semibold text-muted">{t("noNotifications")}</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {items.map((n) => (
                      <li
                        key={n.id}
                        className={`px-3.5 py-3 hover:bg-panel2/60 transition ${
                          n.read ? "opacity-80" : "bg-sky-50/40"
                        }`}
                      >
                        <div className="flex gap-2.5">
                          <span
                            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              n.read ? "bg-slate-300" : "bg-rose-500"
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-extrabold text-ink leading-snug">{n.title}</p>
                              <span className="text-[9px] font-semibold text-muted shrink-0">
                                {timeAgo(n.createdAt, t)}
                              </span>
                            </div>
                            {n.body && (
                              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{n.body}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5">
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
                                className="text-[10px] font-bold text-rose-500 hover:underline ml-auto"
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
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white text-xs font-bold shadow-glow hover:brightness-110 transition shrink-0"
            aria-label={t("profile")}
          >
            {initials || <User size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
