import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  AlertTriangle,
  Stethoscope,
  ShieldAlert,
  HeartPulse,
  Check,
  User,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import ConfidenceBar from "../components/ConfidenceBar.jsx";
import ResultEmptyState from "../components/ResultEmptyState.jsx";
import {
  getGenderSymptoms,
  getGenderInjuries,
  predictGenderSymptoms,
  predictGenderInjury,
} from "../api/client.js";
import { getProfile } from "../utils/profile.js";


const LOGO_BG = [
  "bg-rose-100", "bg-sky-100", "bg-violet-100", "bg-amber-100",
  "bg-teal-100", "bg-pink-100", "bg-indigo-100", "bg-lime-100",
];

const SYMPTOM_EMOJI = {
  fever: "🤒", cough: "😷", headache: "🤕", fatigue: "😴", nausea: "🤢",
  vomit: "🤮", diarrhea: "🚽", rash: "🩹", pain: "😣", chest: "💔",
  throat: "😮‍💨", cold: "🥶", flu: "🤒", dizzy: "😵‍💫", anxiety: "😰",
  sleep: "😴", skin: "🖐️", joint: "🦴", back: "🔙", stomach: "🤢",
  breath: "😮‍💨", injury: "🤕", burn: "🔥", cut: "🩸", sprain: "🦵",
  fracture: "🦴", bruise: "🟣", wound: "🩹", bleed: "🩸",
};

function emojiFor(name = "") {
  const n = String(name).toLowerCase();
  for (const [k, e] of Object.entries(SYMPTOM_EMOJI)) {
    if (n.includes(k)) return e;
  }
  // fallback: use a few medical emojis by hash
  const pool = ["🩺", "💊", "🏥", "🩹", "🌡️", "💉", "🧬", "❤️"];
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) | 0;
  return pool[Math.abs(h) % pool.length];
}

function logoBg(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return LOGO_BG[Math.abs(h) % LOGO_BG.length];
}

const GENDERS = [
  { id: "male", label: "Male", icon: User, color: "bg-sky-500" },
  { id: "female", label: "Female", icon: HeartPulse, color: "bg-pink-500" },
  { id: "unknown", label: "Prefer not to say", icon: Users, color: "bg-slate-400" },
];

const SEV_COLOR = {
  Mild: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Moderate: "bg-amber-100 text-amber-800 border-amber-200",
  Severe: "bg-orange-100 text-orange-800 border-orange-200",
  Emergency: "bg-red-100 text-red-700 border-red-200",
};

function severityClass(s) {
  return SEV_COLOR[s] || "bg-panel2 text-muted border-border";
}

function normalizeProfileGender(g) {
  const v = (g || "").trim().toLowerCase();
  if (v.startsWith("m")) return "male";
  if (v.startsWith("f")) return "female";
  return "unknown";
}

export default function GenderHealthCheck() {
  const profile = getProfile();
  const [tab, setTab] = useState("symptoms"); // symptoms | injuries
  const [gender, setGender] = useState(() => normalizeProfileGender(profile.gender));
  const [intensity, setIntensity] = useState(0.7);
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState({ items: [], by_category: {}, body_parts: [] });
  const [selected, setSelected] = useState([]); // symptom names
  const [injuryHint, setInjuryHint] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [loadingCat, setLoadingCat] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingCat(true);
    setResult(null);
    setError(null);
    const loader = tab === "symptoms" ? getGenderSymptoms : getGenderInjuries;
    loader()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e.response?.data?.detail || e.message || "Could not load catalog");
      })
      .finally(() => {
        if (!cancelled) setLoadingCat(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = catalog.items || [];
    if (!q) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category || "").toLowerCase().includes(q) ||
        (s.body_part || "").toLowerCase().includes(q)
    );
  }, [catalog, query]);

  const grouped = useMemo(() => {
    const map = {};
    for (const item of filtered) {
      const cat = item.category || "Other";
      (map[cat] ||= []).push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleSymptom = (name) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const runPredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      if (tab === "symptoms") {
        if (!selected.length) {
          setError("Select at least one symptom.");
          return;
        }
        const data = await predictGenderSymptoms({
          symptoms: selected,
          gender,
          intensity,
        });
        setResult(data);
      } else {
        if (!injuryHint && !bodyPart) {
          setError("Pick an injury type and/or a body part.");
          return;
        }
        const data = await predictGenderInjury({
          injuryHint: injuryHint || undefined,
          bodyPart: bodyPart || undefined,
          gender,
          intensity,
        });
        setResult(data);
      }
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Prediction failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shrink-0 shadow-glow text-white">
            <Users size={22} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Gender-Aware Health Check</h2>
            <p className="text-xs text-muted">
              ML trained on male/female clinical notes from your dataset — personalised guidance
            </p>
          </div>
        </div>

        {/* Gender selector */}
        <div className="mt-5 bg-panel border border-border rounded-xl2 p-4">
          <p className="text-xs font-semibold text-muted mb-2">Who is this check for?</p>
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map(({ id, label, icon: Icon, color }) => {
              const active = gender === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setGender(id)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                    active
                      ? "border-accent bg-accent/10 text-accent2 shadow-sm"
                      : "border-border bg-panel2 text-muted hover:border-accent/40"
                  }`}
                >
                  <span className={`w-8 h-8 rounded-full ${color} flex items-center justify-center text-white`}>
                    <Icon size={16} />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
          {profile.gender && normalizeProfileGender(profile.gender) === gender && (
            <p className="text-[11px] text-muted mt-2">Using gender from your profile.</p>
          )}

          <div className="mt-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted">How intense does it feel?</p>
              <span className="text-xs font-bold text-accent">{Math.round(intensity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={intensity}
              onChange={(e) => setIntensity(parseFloat(e.target.value))}
              className="w-full accent-accent h-1.5 cursor-pointer"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-5">
          {[
            { id: "symptoms", label: "Symptoms", icon: Stethoscope },
            { id: "injuries", label: "Injuries", icon: HeartPulse },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id);
                setSelected([]);
                setInjuryHint("");
                setBodyPart("");
                setResult(null);
                setQuery("");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-semibold transition ${
                tab === id
                  ? "bg-gradient-to-r from-accent to-accent2 text-white shadow-md shadow-accent/20"
                  : "bg-panel border border-border text-muted hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start mt-5">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === "symptoms" ? "Search symptoms…" : "Search injuries…"}
                className="w-full bg-panel border border-border rounded-full pl-9 pr-4 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>

            {tab === "symptoms" && selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className="text-[11px] bg-accent/10 text-accent2 border border-accent/30 rounded-full px-2.5 py-1 font-medium"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            )}

            {tab === "injuries" && (
              <div className="bg-panel border border-border rounded-xl2 p-4 space-y-3">
                <div>
                  <label className="text-xs text-muted">Body part (optional)</label>
                  <select
                    value={bodyPart}
                    onChange={(e) => setBodyPart(e.target.value)}
                    className="w-full mt-1 bg-panel2 border border-border rounded-xl px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="">Any / not sure</option>
                    {(catalog.body_parts || []).map((bp) => (
                      <option key={bp} value={bp}>
                        {bp}
                      </option>
                    ))}
                  </select>
                </div>
                {injuryHint && (
                  <p className="text-xs">
                    Selected injury:{" "}
                    <span className="font-semibold text-accent2">{injuryHint}</span>
                    <button
                      type="button"
                      className="ml-2 text-muted underline"
                      onClick={() => setInjuryHint("")}
                    >
                      clear
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* Catalog */}
            <section className="bg-panel border border-border rounded-xl2 p-4 md:p-5 max-h-[28rem] overflow-y-auto">
              {loadingCat && (
                <p className="text-sm text-muted animate-pulse">Loading catalog…</p>
              )}
              {!loadingCat && grouped.length === 0 && (
                <p className="text-sm text-muted">No matches.</p>
              )}
              {grouped.map(([cat, items]) => (
                <div key={cat} className="mb-4 last:mb-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-muted mb-2">
                    {cat}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                      const active =
                        tab === "symptoms"
                          ? selected.includes(item.name)
                          : injuryHint === item.name;
                      return (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() =>
                            tab === "symptoms"
                              ? toggleSymptom(item.name)
                              : setInjuryHint(item.name === injuryHint ? "" : item.name)
                          }
                          className={`text-left text-xs rounded-2xl border px-2.5 py-2 transition max-w-full flex items-start gap-2 ${
                            active
                              ? "bg-white border-accent ring-2 ring-accent/30 shadow-md"
                              : "bg-panel2 border-border hover:border-accent/50 text-ink hover:shadow-soft"
                          }`}
                        >
                          <span
                            className={`relative w-10 h-10 rounded-xl ${logoBg(item.name)} flex items-center justify-center text-[1.25rem] leading-none shadow-sm shrink-0`}
                          >
                            <span aria-hidden className="select-none">{emojiFor(item.name)}</span>
                            {active && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white text-[8px] text-white flex items-center justify-center font-black">
                                ✓
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className={`font-bold block leading-tight ${active ? "text-ink" : "text-ink"}`}>
                              {item.name}
                            </span>
                            <span className="block mt-0.5 text-muted leading-snug">
                              {item.severity}
                              {item.has_male_notes || item.has_female_notes ? " · gender notes" : ""}
                              {item.body_part ? ` · ${item.body_part}` : ""}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <button
              type="button"
              onClick={runPredict}
              disabled={loading}
              className="w-full bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold py-3 rounded-full hover:opacity-90 active:scale-95 transition disabled:opacity-50 shadow-lg shadow-accent/15"
            >
              {loading ? "Analyzing with gender model…" : "Run Gender-Aware Prediction"}
            </button>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
              </div>
            )}
          </div>

          {/* Result panel */}
          <div className="mt-5 lg:mt-0">
            {!result && !loading && (
              <ResultEmptyState
                title="Gender-aware result"
                subtitle="Select symptoms or an injury, choose male/female, and run the model. Advice includes dataset-specific notes for that gender when available."
              />
            )}

            {loading && (
              <div className="bg-panel border border-border rounded-xl2 p-5 animate-pulse space-y-3">
                <div className="h-4 bg-panel2 rounded w-2/3" />
                <div className="h-3 bg-panel2 rounded w-full" />
                <div className="h-3 bg-panel2 rounded w-5/6" />
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-fade-slide-up">
                <div className="bg-panel border border-border rounded-xl2 p-5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs text-muted">Top match · {result.gender}</p>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${severityClass(
                        result.severity
                      )}`}
                    >
                      {result.severity}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold">{result.condition}</h3>
                  <p className="text-xs text-muted mt-0.5">{result.category}{result.body_part ? ` · ${result.body_part}` : ""}</p>
                  <div className="mt-2">
                    <ConfidenceBar value={result.confidence} size="md" />
                  </div>
                  <p className="text-xs text-muted mt-3">{result.explanation}</p>
                </div>

                {result.gender_notes && (
                  <div className="bg-gradient-to-br from-sky-50 to-pink-50 border border-sky-100 rounded-xl2 p-5">
                    <p className="text-xs font-semibold text-accent2 mb-1 flex items-center gap-1.5">
                      <Users size={13} />
                      {result.gender === "unknown" ? "Gender notes" : `${result.gender} specific notes`}
                    </p>
                    <p className="text-sm leading-relaxed">{result.gender_notes}</p>
                  </div>
                )}

                {result.probabilities?.length > 1 && (
                  <div className="bg-panel border border-border rounded-xl2 p-5">
                    <p className="text-xs font-semibold text-muted mb-2">Other possibilities</p>
                    <div className="space-y-2.5">
                      {result.probabilities.slice(1, 5).map((p) => (
                        <div key={p.condition}>
                          <div className="flex items-center justify-between text-xs mb-1 gap-2">
                            <span className="truncate">{p.condition}</span>
                            <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${severityClass(p.severity)}`}>
                              {p.severity || "—"}
                            </span>
                          </div>
                          <ConfidenceBar value={p.confidence} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.recommendations?.length > 0 && (
                  <div className="bg-panel border border-border rounded-xl2 p-5">
                    <p className="text-xs font-semibold text-muted mb-2">Recommendations</p>
                    <ul className="space-y-2">
                      {result.recommendations.map((r, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-accent shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.treatment?.length > 0 && (
                  <div className="bg-panel border border-border rounded-xl2 p-5">
                    <p className="text-xs font-semibold text-muted mb-2">
                      {tab === "injuries" ? "First aid / care" : "Basic treatment"}
                    </p>
                    <ul className="space-y-2">
                      {result.treatment.map((t, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-accent shrink-0">•</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.red_flags && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg p-3">
                    <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">Red flags</p>
                      <p>{result.red_flags}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg p-3">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>{result.when_to_see_doctor}</span>
                </div>

                {result.recovery_time && (
                  <p className="text-xs text-muted px-1">
                    Typical recovery: <strong>{result.recovery_time}</strong>
                  </p>
                )}

                <p className="text-[11px] text-muted italic px-1">{result.disclaimer}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
