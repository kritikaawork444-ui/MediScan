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
  Users,
  BadgePlus,
  Sparkles,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function Sidebar() {
  const { t } = useLanguage();
  const tabs = [
    { to: "/", label: t("dashboard"), icon: Home },
    { to: "/ai-checker", label: t("symptomChecker"), icon: Stethoscope },
    { to: "/ml-checker", label: t("mlPredictor"), icon: BrainCircuit },
    { to: "/gender-check", label: t("genderHealth"), icon: Users },
    { to: "/consult", label: t("doctorConsult"), icon: BadgePlus, badge: t("free") },
    { to: "/reports", label: t("reports"), icon: FileText },
    { to: "/injury", label: t("injury"), icon: Activity },
    { to: "/encyclopedia", label: t("encyclopedia"), icon: BookOpen },
    { to: "/history", label: t("history"), icon: History },
    { to: "/profile", label: t("profile"), icon: User },
  ];

  return (
    <aside className="hidden md:flex md:flex-col w-[17rem] shrink-0 min-h-screen sticky top-0 p-3">
      <div className="flex flex-col flex-1 rounded-3xl glass-panel shadow-card overflow-hidden">
        {/* Brand */}
        <div className="px-5 pt-6 pb-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-accent via-accent2 to-indigo-500 flex items-center justify-center shrink-0 shadow-glow group-hover:scale-105 transition">
              <Heart size={20} className="text-white" fill="white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight tracking-tight text-ink">
                MediScan
              </h1>
              <p className="text-[10px] text-muted font-medium flex items-center gap-1">
                <Sparkles size={10} className="text-accent" />
                {t("companion")}
              </p>
            </div>
          </Link>
        </div>

        {/* Free consult promo */}
        <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-sky-50 border border-emerald-100/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
            {t("freeThisWeek")}
          </p>
          <p className="text-xs font-semibold text-ink mt-0.5">{t("doctorConsultsFree")}</p>
          <Link
            to="/consult"
            className="mt-2 inline-flex text-[11px] font-bold text-accent2 hover:underline"
          >
            {t("bookNow")}
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3 pb-4 overflow-y-auto">
          {tabs.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-accent to-accent2 text-white font-semibold shadow-glow"
                    : "text-muted hover:bg-panel2 hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition ${
                      isActive ? "bg-white/20" : "bg-panel2 group-hover:bg-white"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 truncate">{label}</span>
                  {badge && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-emerald-100 text-emerald-700"
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

        <div className="px-4 pb-5 pt-2 border-t border-border/60">
          <p className="text-[10px] text-muted leading-relaxed">
            Not a substitute for emergency care. Call local ER for urgent symptoms.
          </p>
        </div>
      </div>
    </aside>
  );
}
