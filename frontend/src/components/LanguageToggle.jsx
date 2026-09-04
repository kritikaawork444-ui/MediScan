import { Languages } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";
import { addNotification } from "../utils/notifications.js";
import { t as tRaw } from "../utils/i18n.js";

/**
 * Segmented control: English / हिंदी / Hinglish.
 * Updates global app language so UI labels switch immediately.
 * Also keeps mediscan_language for AI API requests.
 */
export default function LanguageToggle({ value, onChange, className = "" }) {
  const { language, setLanguage, languages, t } = useLanguage();
  const current = value ?? language;

  const pick = (code) => {
    if (code === current) return;
    setLanguage(code);
    onChange?.(code);

    const bodyKey =
      code === "hi" ? "notifLangBody" : code === "hinglish" ? "notifLangBodyHinglish" : "notifLangBodyEn";
    addNotification({
      title: tRaw("notifLangTitle", code),
      body: tRaw(bodyKey, code),
      type: "language",
      href: null,
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Languages size={14} className="text-muted shrink-0" aria-hidden />
      <span className="text-[11px] font-semibold text-muted hidden sm:inline">{t("language")}</span>
      <div className="flex bg-panel2 border border-border rounded-full p-0.5">
        {languages.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => pick(lang.code)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150 ${
              current === lang.code
                ? "bg-accent text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
            aria-pressed={current === lang.code}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
}
