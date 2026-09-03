import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Stethoscope,
  FileText,
  Activity,
  BookOpen,
  History as HistoryIcon,
  User,
  ArrowRight,
  Lightbulb,
  Sparkles,
  BrainCircuit,
  Users,
  BadgePlus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { getHistory } from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { formatShortDate } from "../utils/datetime.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

const TIPS = [
  "Drink plenty of water and rest well to keep your body sharp.",
  "A 20-minute walk a day can meaningfully improve heart health.",
  "Try to get 7–9 hours of sleep — it's when your body repairs itself.",
  "Wash your hands often, especially before meals, to avoid infections.",
  "Deep breathing for a few minutes can lower stress and blood pressure.",
];

const QUICK_ACCESS = [
  {
    to: "/ai-checker",
    label: "Symptom Checker",
    sub: "AI causes & next steps",
    icon: Stethoscope,
    gradient: "from-sky-400 to-blue-600",
    soft: "from-sky-50 to-blue-50",
  },
  {
    to: "/consult",
    label: "Doctor Consult",
    sub: "100% free bookings",
    icon: BadgePlus,
    gradient: "from-emerald-400 to-teal-600",
    soft: "from-emerald-50 to-teal-50",
    badge: "FREE",
  },
  {
    to: "/ml-checker",
    label: "ML Predictor",
    sub: "Trained disease model",
    icon: BrainCircuit,
    gradient: "from-teal-400 to-cyan-600",
    soft: "from-teal-50 to-cyan-50",
  },
  {
    to: "/gender-check",
    label: "Gender Health",
    sub: "Male / female aware ML",
    icon: Users,
    gradient: "from-fuchsia-400 to-pink-600",
    soft: "from-fuchsia-50 to-pink-50",
  },
  {
    to: "/reports",
    label: "Report Scanner",
    sub: "Lab values → insights",
    icon: FileText,
    gradient: "from-violet-400 to-indigo-600",
    soft: "from-violet-50 to-indigo-50",
  },
  {
    to: "/injury",
    label: "Injury Analyzer",
    sub: "Photo → first aid ML",
    icon: Activity,
    gradient: "from-rose-400 to-orange-500",
    soft: "from-rose-50 to-orange-50",
  },
  {
    to: "/encyclopedia",
    label: "Encyclopedia",
    sub: "Conditions & care tips",
    icon: BookOpen,
    gradient: "from-amber-400 to-orange-500",
    soft: "from-amber-50 to-orange-50",
  },
  {
    to: "/history",
    label: "History",
    sub: "Past checks & scans",
    icon: HistoryIcon,
    gradient: "from-lime-400 to-emerald-600",
    soft: "from-lime-50 to-emerald-50",
  },
  {
    to: "/profile",
    label: "Profile",
    sub: "Your health details",
    icon: User,
    gradient: "from-indigo-400 to-blue-600",
    soft: "from-indigo-50 to-blue-50",
  },
];

const ICONS = { symptom: Stethoscope, report: FileText, injury: Activity, consult: BadgePlus };

function greetingKey() {
  const h = new Date().getHours();
  if (h < 12) return "greetingMorning";
  if (h < 17) return "greetingAfternoon";
  return "greetingEvening";
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [recent, setRecent] = useState([]);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);
  const name = getProfile().name;

  useEffect(() => {
    getHistory()
      .then((all) => setRecent(all.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="page-enter">
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        <LanguageToggle className="mb-3" />
        {/* Hero */}
        <div className="hero-glow relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-float">
          <div className="absolute inset-0 bg-mesh-hero opacity-80 pointer-events-none" />
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10 blur-2xl animate-pulse-soft" />
          <div className="absolute right-10 bottom-0 w-32 h-32 rounded-full bg-teal-300/20 blur-xl animate-floaty" />
          <div className="absolute left-1/3 -bottom-8 w-40 h-24 rounded-full bg-indigo-300/20 blur-2xl" />

          <div className="relative z-[2]">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 border border-white/25 backdrop-blur-md rounded-full px-3 py-1 mb-3">
              <Zap size={12} className="text-amber-200" />
              On-device AI · Private by design
            </div>
            <p className="text-white/85 text-sm font-medium">
              {t(greetingKey())}
              {name ? `, ${name}` : ""} 👋
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1 tracking-tight leading-tight max-w-lg">
              {t("howFeeling")}
            </h2>
            <p className="text-white/80 text-sm mt-2 max-w-md leading-relaxed">
              Check symptoms, scan reports, or book a{" "}
              <span className="font-semibold text-white">free doctor consult</span> — all in one
              place.
            </p>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => navigate("/ai-checker")}
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-bold text-sm px-5 py-2.5 rounded-full shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition"
              >
                <Sparkles size={16} className="text-sky-500" />
                {t("startSymptomCheck")}
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/consult")}
                className="inline-flex items-center gap-2 bg-white/15 border border-white/40 text-white font-bold text-sm px-5 py-2.5 rounded-full backdrop-blur-md hover:bg-white/25 active:scale-95 transition"
              >
                <BadgePlus size={16} />
                {t("freeDoctorConsult")}
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-medium text-white/80">
              <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 border border-white/15">
                <ShieldCheck size={12} /> {t("offlineReady")}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 border border-white/15">
                <BadgePlus size={12} /> {t("freeConsults")}
              </span>
            </div>
          </div>
        </div>

        {/* Health tip */}
        <div className="flex items-start gap-3 card-surface p-4 mt-5 card-hover">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 flex items-center justify-center shrink-0 shadow-soft">
            <Lightbulb size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink">{t("healthTip")}</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{tip}</p>
          </div>
        </div>

        {/* Quick access */}
        <div className="flex items-center justify-between mt-7 mb-3">
          <h3 className="section-title text-base">{t("quickAccess")}</h3>
          <span className="text-[11px] text-muted font-medium">
            {QUICK_ACCESS.length} {t("tools")}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger">
          {QUICK_ACCESS.map(({ to, label, sub, icon: Icon, gradient, soft, badge }) => (
            <Link
              key={to}
              to={to}
              className={`relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br ${soft} p-4 shadow-soft card-hover group`}
            >
              <div
                className={`absolute -right-4 -top-4 w-16 h-16 rounded-full bg-gradient-to-br ${gradient} opacity-10 group-hover:opacity-20 transition`}
              />
              {badge && (
                <span className="absolute top-3 right-3 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shadow-sm">
                  {badge}
                </span>
              )}
              <div
                className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md text-white`}
              >
                <Icon size={20} />
              </div>
              <p className="text-sm font-bold text-ink leading-tight">{label}</p>
              <p className="text-[11px] text-muted mt-0.5 leading-snug">{sub}</p>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="flex items-center justify-between mt-8 mb-3">
          <h3 className="section-title text-base">{t("recentActivity")}</h3>
          {recent.length > 0 && (
            <Link to="/history" className="text-accent2 text-xs font-bold hover:underline">
              {t("viewAll")}
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="card-surface border-dashed p-5 text-center">
            <p className="text-sm font-semibold text-ink">{t("nothingYet")}</p>
            <p className="text-xs text-muted mt-1">
              Run a symptom check, scan a report, or book a free consult.
            </p>
            <button
              type="button"
              onClick={() => navigate("/ai-checker")}
              className="btn-primary mt-4 text-xs"
            >
              {t("getStarted")}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 stagger">
            {recent.map((item) => {
              const Icon = ICONS[item.analysis_type] || FileText;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between card-surface p-3.5 card-hover"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent2/15 text-accent2 flex items-center justify-center shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-ink">{item.title}</p>
                      <p className="text-emerald-600 text-xs font-medium truncate">
                        {item.result_label}
                        {item.confidence ? ` · ${item.confidence}%` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] font-semibold text-muted shrink-0 ml-2 bg-panel2 px-2 py-1 rounded-lg">
                    {formatShortDate(item.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
