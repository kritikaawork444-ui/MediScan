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
  BadgePlus,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { getHistory } from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const TIPS = [
  "Drink plenty of water and rest well to keep your body sharp.",
  "A 20-minute walk a day can meaningfully improve heart health.",
  "Try to get 7-9 hours of sleep - it's when your body repairs itself.",
  "Wash your hands often, especially before meals, to avoid infections.",
  "Deep breathing for a few minutes can lower stress and blood pressure.",
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

  const QUICK_ACCESS = [
    {
      to: "/ai-checker",
      label: t("symptomChecker"),
      sub: "Check your symptoms",
      icon: Stethoscope,
      bg: "bg-sky-100",
      fg: "text-sky-600",
    },
    {
      to: "/consult",
      label: t("doctorConsult"),
      sub: "100% free bookings",
      icon: BadgePlus,
      bg: "bg-emerald-100",
      fg: "text-emerald-600",
      badge: t("free"),
    },
    {
      to: "/ml-checker",
      label: t("mlPredictor"),
      sub: "Trained model + AI treatment",
      icon: BrainCircuit,
      bg: "bg-teal-100",
      fg: "text-teal-600",
    },
    {
      to: "/reports",
      label: t("reports"),
      sub: "Scan a lab report",
      icon: FileText,
      bg: "bg-violet-100",
      fg: "text-violet-600",
    },
    {
      to: "/injury",
      label: t("injury"),
      sub: "Analyze an injury photo",
      icon: Activity,
      bg: "bg-rose-100",
      fg: "text-rose-600",
    },
    {
      to: "/encyclopedia",
      label: t("encyclopedia"),
      sub: "Explore conditions",
      icon: BookOpen,
      bg: "bg-amber-100",
      fg: "text-amber-600",
    },
    {
      to: "/history",
      label: t("history"),
      sub: "View past analyses",
      icon: HistoryIcon,
      bg: "bg-emerald-100",
      fg: "text-emerald-600",
    },
    {
      to: "/profile",
      label: t("profile"),
      sub: "Your details",
      icon: User,
      bg: "bg-indigo-100",
      fg: "text-indigo-600",
    },
  ];

  useEffect(() => {
    getHistory()
      .then((all) => setRecent(all.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div>
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-6">
        <LanguageToggle className="mb-3" />

        {/* Greeting + CTA */}
        <div className="bg-gradient-to-br from-accent to-accent2 rounded-xl2 p-6 md:p-8 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-2 bottom-0 w-24 h-24 rounded-full bg-white/10" />
          <p className="text-white/80 text-sm relative">
            {t(greetingKey())}
            {name ? `, ${name}` : ""} 👋
          </p>
          <h2 className="text-2xl md:text-3xl font-bold mt-1 relative">{t("howFeeling")}</h2>
          <p className="text-white/80 text-sm mt-2 relative max-w-md">
            Select your symptoms and let a private, on-device AI walk you through possible causes and next
            steps — or book a free doctor consult.
          </p>
          <div className="relative mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/ai-checker")}
              className="inline-flex items-center gap-2 bg-white text-accent2 font-semibold text-sm px-5 py-2.5 rounded-full hover:opacity-90 active:scale-95 transition"
            >
              <Sparkles size={16} />
              {t("startSymptomCheck")}
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => navigate("/consult")}
              className="inline-flex items-center gap-2 bg-white/15 border border-white/40 text-white font-semibold text-sm px-5 py-2.5 rounded-full hover:bg-white/25 active:scale-95 transition"
            >
              <BadgePlus size={16} />
              {t("freeDoctorConsult")}
            </button>
          </div>
        </div>

        {/* Health tip */}
        <div className="flex items-start gap-3 bg-panel border border-border rounded-xl2 p-4 mt-5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Lightbulb size={16} className="text-amber-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("healthTip")}</p>
            <p className="text-xs text-muted mt-0.5">{tip}</p>
          </div>
        </div>

        {/* Quick access */}
        <h3 className="font-semibold text-sm mt-6 mb-3">{t("quickAccess")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACCESS.map(({ to, label, sub, icon: Icon, bg, fg, badge }) => (
            <Link
              key={to}
              to={to}
              className="relative bg-panel border border-border rounded-xl2 p-4 hover:border-accent/40 hover:-translate-y-0.5 transition-all duration-150"
            >
              {badge && (
                <span className="absolute top-3 right-3 text-[9px] font-extrabold tracking-wide px-1.5 py-0.5 rounded-md bg-emerald-500 text-white">
                  {badge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon size={18} className={fg} />
              </div>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px] text-muted mt-0.5">{sub}</p>
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        <div className="flex items-center justify-between mt-7 mb-2">
          <h3 className="font-semibold text-sm">{t("recentActivity")}</h3>
          {recent.length > 0 && (
            <Link to="/history" className="text-accent text-xs hover:opacity-80">
              {t("viewAll")}
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="text-muted text-xs">
            No history yet. Run a symptom check, report scan, or book a free consult.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((item) => {
              const Icon = ICONS[item.analysis_type] || FileText;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-panel border border-border rounded-xl2 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="bg-panel2 p-2 rounded-lg text-accent shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{item.title}</p>
                      <p className="text-emerald-600 text-xs">
                        {item.result_label}
                        {item.confidence ? ` (${item.confidence}% Match)` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted shrink-0 ml-2">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    })}
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
