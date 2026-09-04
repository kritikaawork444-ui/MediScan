import { useState } from "react";
import {
  Cpu,
  Plus,
  X,
  MapPin,
  Waves,
  Sparkles,
  WifiOff,
  Thermometer,
  Wind,
  Brain,
  Flame,
  BatteryLow,
  Frown,
  HeartPulse,
  Bone,
  RotateCw,
  Droplet,
  CircleDot,
  MoveVertical,
  Mic,
  Fingerprint,
  CircleDashed,
  Zap,
  Moon,
  Activity,
  Grip,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import ResultSkeleton from "../components/ResultSkeleton.jsx";
import SymptomResultCard from "../components/SymptomResultCard.jsx";
import ResultEmptyState from "../components/ResultEmptyState.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import { checkSymptoms } from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { getLanguage, setLanguage } from "../utils/language.js";

const POPULAR = [
  { label: "Fever", icon: Thermometer },
  { label: "Cough", icon: Wind },
  { label: "Headache", icon: Brain },
  { label: "Sore Throat", icon: Flame },
  { label: "Fatigue", icon: BatteryLow },
  { label: "Nausea", icon: Frown },
  { label: "Chest Pain", icon: HeartPulse },
  { label: "Body Ache", icon: Bone },
  { label: "Dizziness", icon: RotateCw },
  { label: "Runny Nose", icon: Droplet },
];

const BODY_PARTS = [
  { label: "Head", icon: Brain },
  { label: "Chest", icon: HeartPulse },
  { label: "Abdomen", icon: CircleDot },
  { label: "Back", icon: MoveVertical },
  { label: "Throat", icon: Mic },
  { label: "Joints/Limbs", icon: Bone },
  { label: "Skin", icon: Fingerprint },
  { label: "Other", icon: CircleDashed },
];

const PAIN_TYPES = [
  { label: "Sharp", icon: Zap },
  { label: "Dull", icon: Moon },
  { label: "Burning", icon: Flame },
  { label: "Throbbing", icon: Activity },
  { label: "Tight/Pressure", icon: Grip },
  { label: "Cramping", icon: Waves },
];

const chip = (active) =>
  `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-150 active:scale-95 ${
    active
      ? "bg-accent/10 border-accent text-accent font-medium"
      : "bg-panel border-border text-muted hover:border-accent/50 hover:text-ink"
  }`;

export default function SymptomCheckerLocal() {
  const [selected, setSelected] = useState([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [painLocation, setPainLocation] = useState(null);
  const [painType, setPainType] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [language, setLang] = useState(getLanguage);

  const changeLanguage = (code) => {
    setLang(code);
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
      const profile = getProfile();
      const data = await checkSymptoms(selected, {
        painLocation,
        painDescription: painType,
        notes: notes || undefined,
        language,
        gender: profile.gender || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.message ||
          "Could not analyze symptoms. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  };

  const contextLine =
    painLocation || painType
      ? `Based on ${painLocation ? `pain in ${painLocation.toLowerCase()}` : ""}${
          painLocation && painType ? ", " : ""
        }${painType ? `${painType.toLowerCase()} sensation` : ""}`
      : null;

  return (
    <div>
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Cpu size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Symptom Checker</h2>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
              On-device guide — offline knowledge base · no cloud AI
            </p>
          </div>
        </div>

        <LanguageToggle value={language} onChange={changeLanguage} className="mt-4" />

        {(() => {
          const g = (getProfile().gender || "").trim();
          if (g) {
            return (
              <p className="mt-3 text-[11px] text-muted bg-panel2 border border-border rounded-xl px-3 py-2">
                Treatment will use your profile gender: <span className="font-bold text-ink">{g}</span>
                {" "}· change in Profile
              </p>
            );
          }
          return (
            <p className="mt-3 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Set <span className="font-bold">Male / Female</span> in Profile so treatment notes match your gender.
            </p>
          );
        })()}

        {/* Symptom selection + live result, side by side on desktop */}
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start mt-5">
          <div>
            <section className="bg-panel border border-border rounded-xl2 p-4 md:p-5">
              <h3 className="text-sm font-semibold mb-3">What are you feeling?</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {POPULAR.map(({ label, icon: Icon }) => (
                  <button key={label} onClick={() => toggle(label)} className={chip(selected.includes(label))}>
                    <Icon size={14} className="shrink-0" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <input
                  value={customSymptom}
                  onChange={(e) => setCustomSymptom(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCustomSymptom()}
                  placeholder="Add another symptom..."
                  className="flex-1 min-w-0 bg-panel2 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted"
                />
                <button
                  onClick={addCustomSymptom}
                  className="w-10 h-10 shrink-0 rounded-xl bg-accent text-base flex items-center justify-center hover:opacity-90 active:scale-95 transition"
                >
                  <Plus size={18} />
                </button>
              </div>

              {selected.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
                  {selected.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 bg-panel2 border border-border text-xs px-3 py-1.5 rounded-full animate-pop-in"
                    >
                      {s}
                      <X size={12} className="cursor-pointer text-muted hover:text-ink" onClick={() => toggle(s)} />
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Location + pain type */}
            <section className="bg-panel border border-border rounded-xl2 p-4 md:p-5 mt-4 space-y-5">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <MapPin size={14} className="text-accent" /> Where does it hurt?
                  <span className="text-muted text-xs font-normal">(optional)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {BODY_PARTS.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => setPainLocation(painLocation === label ? null : label)}
                      className={chip(painLocation === label)}
                    >
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Waves size={14} className="text-accent" /> What does it feel like?
                  <span className="text-muted text-xs font-normal">(optional)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {PAIN_TYPES.map(({ label, icon: Icon }) => (
                    <button
                      key={label}
                      onClick={() => setPainType(painType === label ? null : label)}
                      className={chip(painType === label)}
                    >
                      <Icon size={14} className="shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Anything else? (optional)</h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. started 2 days ago, worse at night..."
                  className="w-full bg-panel2 border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted resize-none"
                />
              </div>
            </section>

            {/* Submit */}
            <button
              onClick={analyze}
              disabled={selected.length === 0 || loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent2 to-accent text-white font-semibold rounded-xl2 py-3.5 mt-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 shadow-lg shadow-accent/10"
            >
              <Sparkles size={17} className={loading ? "animate-spin" : ""} />
              {loading ? "Analyzing..." : "Analyze Symptoms"}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-low/10 border border-low/30 rounded-xl2 p-4 flex gap-3 mt-4 animate-fade-slide-up">
                <WifiOff size={18} className="text-low shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-low">Couldn't connect to Ollama</p>
                  <p className="text-xs text-muted mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {/* Result stacks below the form on mobile/tablet */}
            <div className="lg:hidden">
              {loading && <ResultSkeleton />}
              {!loading && result && (
                <SymptomResultCard result={result} contextLine={contextLine} symptoms={selected} patientName={getProfile().name} />
              )}
            </div>
          </div>

          {/* Live result panel - sticky on desktop only */}
          <div className="hidden lg:block lg:sticky lg:top-6">
            {loading && <ResultSkeleton />}
            {!loading && result && (
              <SymptomResultCard result={result} contextLine={contextLine} symptoms={selected} patientName={getProfile().name} />
            )}
            {!loading && !result && <ResultEmptyState />}
          </div>
        </div>
      </div>
    </div>
  );
}
