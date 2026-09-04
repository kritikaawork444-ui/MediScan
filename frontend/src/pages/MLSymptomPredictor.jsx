import { useState } from "react";
import { BrainCircuit, Thermometer, Brain, Wind, BatteryLow, Bone, AlertTriangle, Stethoscope } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ConfidenceBar from "../components/ConfidenceBar.jsx";
import ResultEmptyState from "../components/ResultEmptyState.jsx";
import { predictML } from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { getLanguage, setLanguage } from "../utils/language.js";

const SLIDERS = [
  { key: "fever", label: "Fever (°F)", icon: Thermometer, min: 97, max: 105, step: 0.1, default: 98.6 },
  { key: "headache", label: "Headache", icon: Brain, min: 0, max: 10, step: 0.1, default: 2 },
  { key: "cough", label: "Cough", icon: Wind, min: 0, max: 10, step: 0.1, default: 1 },
  { key: "fatigue", label: "Fatigue", icon: BatteryLow, min: 0, max: 10, step: 0.1, default: 3 },
  { key: "bodyPain", label: "Body Pain", icon: Bone, min: 0, max: 10, step: 0.1, default: 1 },
];

export default function MLSymptomPredictor() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.default]))
  );
  const [language, setLang] = useState(getLanguage);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const changeLanguage = (code) => {
    setLang(code);
    setLanguage(code);
  };

  const updateValue = (key, val) => setValues((prev) => ({ ...prev, [key]: parseFloat(val) }));

  const predict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const profile = getProfile();
      const data = await predictML({
        ...values,
        language,
        gender: profile.gender || undefined,
      });
      setResult(data);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          e.message ||
          "Could not run prediction. Make sure the backend is up and the ML model is trained."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <BrainCircuit size={20} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">ML Symptom Predictor</h2>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
              Trained ML model + offline treatment guide — no cloud AI
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

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start mt-5">
          <div>
            <section className="bg-panel border border-border rounded-xl2 p-4 md:p-5">
              <h3 className="text-sm font-semibold mb-4">Rate your symptoms</h3>
              <div className="space-y-5">
                {SLIDERS.map(({ key, label, icon: Icon, min, max, step }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        <Icon size={14} className="text-accent shrink-0" />
                        {label}
                      </span>
                      <span className="text-xs font-semibold text-accent">
                        {values[key]}
                        {key === "fever" ? "°F" : "/10"}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={values[key]}
                      onChange={(e) => updateValue(key, e.target.value)}
                      className="w-full accent-accent h-1.5 rounded-full cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={predict}
                disabled={loading}
                className="w-full mt-6 bg-accent text-white text-sm font-semibold py-3 rounded-full hover:opacity-90 active:scale-95 transition disabled:opacity-50"
              >
                {loading ? "Analyzing…" : "Predict & Get Treatment"}
              </button>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mt-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </section>
          </div>

          {/* Result */}
          <div className="mt-5 lg:mt-0">
            {!result && !loading && <ResultEmptyState
              title="Your prediction will show up here"
              subtitle="Set the sliders to match how you're feeling and tap Predict — a trained model picks the most likely condition, then local AI explains it and suggests basic treatment."
            />}

            {loading && (
              <div className="bg-panel border border-border rounded-xl2 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-panel2 rounded w-2/3" />
                <div className="h-3 bg-panel2 rounded w-full" />
                <div className="h-3 bg-panel2 rounded w-5/6" />
                <div className="h-3 bg-panel2 rounded w-3/4" />
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Stethoscope size={16} className="text-accent" />
                    <p className="text-xs text-muted">Most likely condition</p>
                  </div>
                  <h3 className="text-lg font-bold">{result.disease}</h3>
                  {result.gender && result.gender !== "unknown" && (
                    <p className="text-[11px] font-bold text-accent2 mt-1">
                      Treatment for: {result.gender}
                    </p>
                  )}
                  <div className="mt-2">
                    <ConfidenceBar value={result.confidence} size="md" />
                  </div>
                  <p className="text-xs text-muted mt-3">{result.explanation}</p>
                </div>

                {result.gender_notes ? (
                  <div
                    className={`rounded-xl2 p-4 border text-sm ${
                      result.gender === "female"
                        ? "bg-pink-50 border-pink-100"
                        : result.gender === "male"
                          ? "bg-sky-50 border-sky-100"
                          : "bg-panel2 border-border"
                    }`}
                  >
                    <p className="text-xs font-semibold text-accent2 mb-1">
                      {result.gender === "male"
                        ? "Male-specific notes"
                        : result.gender === "female"
                          ? "Female-specific notes"
                          : "Gender notes"}
                    </p>
                    <p className="text-sm leading-relaxed">{result.gender_notes}</p>
                  </div>
                ) : null}

                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <p className="text-xs font-semibold text-muted mb-2">Other possibilities</p>
                  <div className="space-y-2.5">
                    {result.probabilities.slice(1, 4).map((p) => (
                      <div key={p.disease}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{p.disease}</span>
                        </div>
                        <ConfidenceBar value={p.confidence} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <p className="text-xs font-semibold text-muted mb-2">Recommendations</p>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-accent shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-panel border border-emerald-200 rounded-xl2 p-5">
                  <p className="text-xs font-semibold text-emerald-700 mb-2">
                    Basic treatment
                    {result.gender && result.gender !== "unknown"
                      ? ` (${result.gender})`
                      : ""}
                  </p>
                  <ul className="space-y-2">
                    {result.treatment.map((t, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-accent shrink-0">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{result.when_to_see_doctor}</span>
                </div>

                <p className="text-[11px] text-muted italic px-1">{result.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
