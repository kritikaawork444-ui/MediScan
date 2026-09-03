import { useState } from "react";
import { BrainCircuit, AlertTriangle, Stethoscope } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";
import ConfidenceBar from "../components/ConfidenceBar.jsx";
import ResultEmptyState from "../components/ResultEmptyState.jsx";
import { predictML } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const SLIDERS = [
  { key: "fever", label: "Fever (°F)", emoji: "🤒", min: 97, max: 105, step: 0.1, default: 98.6, soft: "bg-rose-100" },
  { key: "headache", label: "Headache", emoji: "🤕", min: 0, max: 10, step: 0.1, default: 2, soft: "bg-violet-100" },
  { key: "cough", label: "Cough", emoji: "😷", min: 0, max: 10, step: 0.1, default: 1, soft: "bg-sky-100" },
  { key: "fatigue", label: "Fatigue", emoji: "😴", min: 0, max: 10, step: 0.1, default: 3, soft: "bg-amber-100" },
  { key: "bodyPain", label: "Body Pain", emoji: "🦴", min: 0, max: 10, step: 0.1, default: 1, soft: "bg-teal-100" },
];

export default function MLSymptomPredictor() {
  const [values, setValues] = useState(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.key, s.default]))
  );
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const changeLanguage = (code) => {
    setLanguage(code);
  };

  const updateValue = (key, val) => setValues((prev) => ({ ...prev, [key]: parseFloat(val) }));

  const predict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await predictML({ ...values, language });
      setResult(data);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        (typeof detail === "string" ? detail : null) ||
          e.message ||
          "Could not run the prediction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center shrink-0 shadow-glow text-white">
            <BrainCircuit size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">ML Symptom Predictor</h2>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block animate-pulse" />
              Trained model + on-device treatment guide — nothing leaves your device
            </p>
          </div>
        </div>

        <LanguageToggle value={language} onChange={changeLanguage} className="mt-4" />

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start mt-5">
          <div>
            <section className="card-surface p-4 md:p-5 shadow-card">
              <h3 className="text-sm font-bold mb-4 text-ink">{t("rateYourSymptoms")}</h3>
              <div className="space-y-4">
                {SLIDERS.map(({ key, label, emoji, min, max, step, soft }) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-border/80 bg-gradient-to-r from-white to-panel2/40 p-3.5"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="flex items-center gap-2.5 text-sm font-bold text-ink">
                        <span
                          className={`w-11 h-11 rounded-2xl ${soft} flex items-center justify-center text-[1.5rem] leading-none shadow-sm shrink-0`}
                        >
                          <span aria-hidden className="select-none">{emoji}</span>
                        </span>
                        {label}
                      </span>
                      <span className="text-xs font-extrabold text-accent2 bg-white border border-border px-2.5 py-1 rounded-full shadow-sm">
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
                      className="w-full accent-accent h-2 rounded-full cursor-pointer"
                    />
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={predict}
                disabled={loading}
                className="w-full mt-6 btn-primary py-3 text-sm disabled:opacity-50"
              >
                {loading ? t("analyzing") : t("predictTreatment")}
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
            {!result && !loading && (
              <ResultEmptyState
                title={t("yourPredictionHere")}
                subtitle={t("predictionSubtitle")}
              />
            )}

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
                    <p className="text-xs text-muted">{t("mostLikelyCondition")}</p>
                  </div>
                  <h3 className="text-lg font-bold">{result.disease}</h3>
                  <div className="mt-2">
                    <ConfidenceBar value={result.confidence} size="md" />
                  </div>
                  <p className="text-xs text-muted mt-3">{result.explanation}</p>
                </div>

                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <p className="text-xs font-semibold text-muted mb-2">{t("otherPossibilities")}</p>
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
                  <p className="text-xs font-semibold text-muted mb-2">{t("recommendations")}</p>
                  <ul className="space-y-2">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-accent shrink-0">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <p className="text-xs font-semibold text-muted mb-2">{t("basicTreatment")}</p>
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
