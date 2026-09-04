import {
  Home,
  FileText,
  Activity,
  BookOpen,
  History,
  Stethoscope,
  User,
  Heart,
  BrainCircuit,
  BadgePlus,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Sidebar() {
  const { t } = useLanguage();
  const tabs = [
    { to: "/", label: t("dashboard"), icon: Home },
    { to: "/ai-checker", label: t("symptomChecker"), icon: Stethoscope },
    { to: "/ml-checker", label: t("mlPredictor"), icon: BrainCircuit },
    { to: "/consult", label: t("doctorConsult"), icon: BadgePlus, badge: t("free") },
    { to: "/reports", label: t("reports"), icon: FileText },
    { to: "/injury", label: t("injury"), icon: Activity },
    { to: "/encyclopedia", label: t("encyclopedia"), icon: BookOpen },
    { to: "/history", label: t("history"), icon: History },
    { to: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 min-h-screen bg-panel border-r border-border px-4 py-6 sticky top-0">
      <div className="mb-6 px-2 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shrink-0">
          <Heart size={18} className="text-white" fill="white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg font-bold leading-tight">{t("appName")}</h1>
          <p className="text-[10px] text-muted -mt-0.5">{t("companion")}</p>
        </div>
      </div>

      <div className="mx-1 mb-4 rounded-xl bg-emerald-50 border border-emerald-100 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
          {t("freeThisWeek")}
        </p>
        <p className="text-xs font-semibold text-ink mt-0.5">{t("doctorConsultsFree")}</p>
        <Link to="/consult" className="mt-1.5 inline-flex text-[11px] font-bold text-accent2 hover:underline">
          {t("bookNow")}
        </Link>
      </div>

      <nav className="flex flex-col gap-1">
        {tabs.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors ${
                isActive
                  ? "bg-gradient-to-r from-accent to-accent2 text-white font-semibold shadow-md shadow-accent/20"
                  : "text-muted hover:bg-panel2 hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} />
                <span className="flex-1 truncate">{label}</span>
                {badge && (
                  <span
                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
