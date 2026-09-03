import { useState } from "react";
import {
  Cpu,
  Plus,
  X,
  MapPin,
  Waves,
  Sparkles,
  WifiOff,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import ResultSkeleton from "../components/ResultSkeleton.jsx";
import SymptomResultCard from "../components/SymptomResultCard.jsx";
import ResultEmptyState from "../components/ResultEmptyState.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { checkSymptomsOllama } from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import { translateSymptomLabel } from "../utils/i18n.js";

const POPULAR = [
  { label: "Fever", emoji: "🤒", soft: "from-rose-50 to-orange-50", ring: "ring-rose-300", bg: "bg-rose-100" },
  { label: "Cough", emoji: "😷", soft: "from-sky-50 to-cyan-50", ring: "ring-sky-300", bg: "bg-sky-100" },
  { label: "Headache", emoji: "🤕", soft: "from-violet-50 to-purple-50", ring: "ring-violet-300", bg: "bg-violet-100" },
  { label: "Sore Throat", emoji: "😮‍💨", soft: "from-orange-50 to-red-50", ring: "ring-orange-300", bg: "bg-orange-100" },
  { label: "Fatigue", emoji: "😴", soft: "from-amber-50 to-yellow-50", ring: "ring-amber-300", bg: "bg-amber-100" },
  { label: "Nausea", emoji: "🤢", soft: "from-lime-50 to-emerald-50", ring: "ring-lime-300", bg: "bg-lime-100" },
  { label: "Chest Pain", emoji: "💔", soft: "from-pink-50 to-rose-50", ring: "ring-pink-300", bg: "bg-pink-100" },
  { label: "Body Ache", emoji: "🦴", soft: "from-teal-50 to-emerald-50", ring: "ring-teal-300", bg: "bg-teal-100" },
  { label: "Dizziness", emoji: "😵‍💫", soft: "from-indigo-50 to-blue-50", ring: "ring-indigo-300", bg: "bg-indigo-100" },
  { label: "Runny Nose", emoji: "🤧", soft: "from-cyan-50 to-blue-50", ring: "ring-cyan-300", bg: "bg-cyan-100" },
];

const BODY_PARTS = [
  { label: "Head", emoji: "🧠", bg: "bg-violet-100" },
  { label: "Chest", emoji: "🫀", bg: "bg-rose-100" },
  { label: "Abdomen", emoji: "🤰", bg: "bg-amber-100" },
  { label: "Back", emoji: "🔙", bg: "bg-slate-100" },
  { label: "Throat", emoji: "🗣️", bg: "bg-orange-100" },
  { label: "Joints/Limbs", emoji: "🦵", bg: "bg-teal-100" },
  { label: "Skin", emoji: "🖐️", bg: "bg-pink-100" },
  { label: "Other", emoji: "✨", bg: "bg-sky-100" },
];

const PAIN_TYPES = [
  { label: "Sharp", emoji: "⚡", bg: "bg-yellow-100" },
  { label: "Dull", emoji: "🌑", bg: "bg-indigo-100" },
  { label: "Burning", emoji: "🔥", bg: "bg-orange-100" },
  { label: "Throbbing", emoji: "💓", bg: "bg-fuchsia-100" },
  { label: "Tight/Pressure", emoji: "🗜️", bg: "bg-blue-100" },
  { label: "Cramping", emoji: "🌊", bg: "bg-emerald-100" },
];

const EMOJI_BY_LABEL = Object.fromEntries(
  [...POPULAR, ...BODY_PARTS, ...PAIN_TYPES].map((x) => [x.label, x])
);

function SymptomEmojiCard({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border text-left p-3 transition-all duration-200 active:scale-[0.97] ${
        active
          ? `bg-gradient-to-br ${item.soft || "from-sky-50 to-blue-50"} border-transparent ring-2 ${
              item.ring || "ring-accent"
            } shadow-md shadow-sky-500/10`
          : "bg-white/95 border-border/80 hover:border-accent/40 hover:shadow-soft hover:-translate-y-0.5"
      }`}
    >
      <div
        className={`relative w-12 h-12 rounded-2xl ${item.bg || "bg-panel2"} flex items-center justify-center text-[1.65rem] leading-none mb-2.5 shadow-sm ${
          active ? "scale-110" : "group-hover:scale-105"
        } transition`}
      >
        <span aria-hidden className="select-none">
          {item.emoji}
        </span>
        {active && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow text-[10px] text-white font-black">
            ✓
          </span>
        )}
      </div>
      <p className={`relative text-[12px] sm:text-sm font-bold leading-tight ${active ? "text-ink" : "text-ink/90"}`}>
        {item.displayLabel || item.label}
      </p>
    </button>
  );
}

function MiniEmojiChip({ item, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border text-sm transition-all duration-200 active:scale-95 shadow-sm ${
        active
          ? "bg-gradient-to-r from-accent to-accent2 border-transparent text-white font-semibold shadow-glow"
          : "bg-white/95 border-border text-muted hover:border-accent/50 hover:text-ink"
      }`}
    >
      <span
        className={`w-8 h-8 rounded-full ${item.bg || "bg-panel2"} flex items-center justify-center text-base leading-none shadow-sm shrink-0`}
      >
        <span aria-hidden className="select-none">
          {item.emoji}
        </span>
      </span>
      {item.displayLabel || item.label}
    </button>
  );
}

export default function SymptomCheckerLocal() {
  const [selected, setSelected] = useState([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [painLocation, setPainLocation] = useState(null);
  const [painType, setPainType] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const { language, setLanguage, t } = useLanguage();

  const changeLanguage = (code) => {
    setLanguage(code);
  };

  const toggle = (symptom) => {
    setSelected((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const addCustomSymptom = () => {
    const value = customSymptom.trim();
    if (value && !selected.includes(value)) {
      setSelected((prev) => [...prev, value]);
    }
    setCustomSymptom("");
  };

  const analyze = async () => {
    if (selected.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await checkSymptomsOllama(selected, {
        painLocation,
        painDescription: painType,
        notes: notes || undefined,
        language,
      });
      setResult(data);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        (typeof detail === "string" ? detail : null) ||
          e.message ||
          "Something went wrong while analyzing symptoms. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const contextLine = (() => {
    if (!painLocation && !painType) return null;
    const loc = painLocation ? translateSymptomLabel(painLocation, language) : "";
    const feel = painType ? translateSymptomLabel(painType, language) : "";
    if (language === "hi") {
      if (loc && feel) return `${loc} में दर्द · ${feel} अनुभूति के आधार पर`;
      if (loc) return `${loc} में दर्द के आधार पर`;
      return `${feel} अनुभूति के आधार पर`;
    }
    if (language === "hinglish") {
      if (loc && feel) return `${loc} mein dard · ${feel} sensation ke base par`;
      if (loc) return `${loc} mein dard ke base par`;
      return `${feel} sensation ke base par`;
    }
    return `Based on ${painLocation ? `pain in ${painLocation.toLowerCase()}` : ""}${
      painLocation && painType ? ", " : ""
    }${painType ? `${painType.toLowerCase()} sensation` : ""}`;
  })();

  return (
    <div className="page-enter">
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shrink-0 shadow-glow text-white">
            <Cpu size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">{t("aiSymptomChecker")}</h2>
            <p className="text-xs text-muted flex items-center gap-1.5 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              {t("onDeviceGuide")}
            </p>
          </div>
        </div>

        <LanguageToggle value={language} onChange={changeLanguage} className="mt-4" />

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start mt-5">
          <div>
            <section className="card-surface p-4 md:p-5 shadow-card">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-sm font-bold text-ink">{t("whatFeeling")}</h3>
                <span className="text-[10px] font-semibold text-muted bg-panel2 px-2 py-0.5 rounded-full">
                  {selected.length} {t("selected")}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {POPULAR.map((item) => (
                  <SymptomEmojiCard
                    key={item.label}
                    item={{ ...item, displayLabel: translateSymptomLabel(item.label, language) }}
                    active={selected.includes(item.label)}
                    onClick={() => toggle(item.label)}
                  />
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomSymptom()}
                  placeholder={t("addSymptom")}
                  className="flex-1 min-w-0 input-field"
                />
                <button
                  type="button"
                  onClick={addCustomSymptom}
                  className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-accent to-accent2 text-white flex items-center justify-center shadow-glow hover:brightness-105 active:scale-95 transition"
                >
                  <Plus size={18} />
                </button>
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {selected.map((s) => {
                    const meta = EMOJI_BY_LABEL[s];
                    return (
                      <span
                        key={s}
                        className="flex items-center gap-1.5 bg-panel2 border border-border text-xs px-2.5 py-1.5 rounded-full animate-pop-in font-semibold text-ink"
                      >
                        <span
                          className={`w-6 h-6 rounded-full ${meta?.bg || "bg-accent/15"} flex items-center justify-center text-sm leading-none`}
                        >
                          {meta?.emoji || "➕"}
                        </span>
                        {translateSymptomLabel(s, language)}
                        <X
                          size={12}
                          className="cursor-pointer text-muted hover:text-ink"
                          onClick={() => toggle(s)}
                        />
                      </span>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="card-surface p-4 md:p-5 mt-4 space-y-5 shadow-soft">
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5 text-ink">
                  <MapPin size={14} className="text-accent" /> {t("whereHurt")}
                  <span className="text-muted text-xs font-normal">{t("optional")}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {BODY_PARTS.map((item) => (
                    <MiniEmojiChip
                      key={item.label}
                      item={{ ...item, displayLabel: translateSymptomLabel(item.label, language) }}
                      active={painLocation === item.label}
                      onClick={() => setPainLocation(painLocation === item.label ? null : item.label)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5 text-ink">
                  <Waves size={14} className="text-accent" /> {t("whatFeel")}
                  <span className="text-muted text-xs font-normal">{t("optional")}</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {PAIN_TYPES.map((item) => (
                    <MiniEmojiChip
                      key={item.label}
                      item={{ ...item, displayLabel: translateSymptomLabel(item.label, language) }}
                      active={painType === item.label}
                      onClick={() => setPainType(painType === item.label ? null : item.label)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold mb-2 text-ink">{t("anythingElse")}</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder={t("notesPlaceholder")}
                  className="w-full input-field resize-none"
                />
              </div>
            </section>

            <button
              type="button"
              onClick={analyze}
              disabled={selected.length === 0 || loading}
              className="w-full btn-primary py-3.5 mt-4 text-sm"
            >
              <Sparkles size={17} className={loading ? "animate-spin" : ""} />
              {loading ? t("analyzing") : t("analyze")}
            </button>

            {error && (
              <div className="bg-low/10 border border-low/30 rounded-xl2 p-4 flex gap-3 mt-4 animate-fade-slide-up">
                <WifiOff size={18} className="text-low shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-low">{t("couldntAnalyze")}</p>
                  <p className="text-xs text-muted mt-0.5">{error}</p>
                </div>
              </div>
            )}

            <div className="lg:hidden">
              {loading && <ResultSkeleton />}
              {!loading && result && (
                <SymptomResultCard
                  result={result}
                  contextLine={contextLine}
                  symptoms={selected}
                  patientName={getProfile().name}
                />
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:sticky lg:top-6">
            {loading && <ResultSkeleton />}
            {!loading && result && (
              <SymptomResultCard
                result={result}
                contextLine={contextLine}
                symptoms={selected}
                patientName={getProfile().name}
              />
            )}
            {!loading && !result && <ResultEmptyState />}
          </div>
        </div>
      </div>
    </div>
  );
}
