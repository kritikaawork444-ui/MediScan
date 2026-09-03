import { useEffect, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquareHeart,
  Send,
  CheckCircle2,
  Star,
  BarChart3,
  Stethoscope,
  GraduationCap,
  Minus,
} from "lucide-react";
import DoctorAvatar from "./DoctorAvatar.jsx";
import {
  submitWebsiteFeedback,
  getWebsiteFeedback,
  getWebsiteFeedbackSummary,
} from "../api/client.js";
import { getProfile } from "../utils/profile.js";

const VERDICTS = [
  {
    id: "sahi",
    label: "Sahi hai",
    sub: "Website acchi lag rahi hai",
    icon: ThumbsUp,
    active: "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30",
    idle: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400",
  },
  {
    id: "galat",
    label: "Galat hai",
    sub: "Improve karna chahiye",
    icon: ThumbsDown,
    active: "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/30",
    idle: "bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-400",
  },
];

const SYMPTOM_OPTS = [
  {
    id: "sahi",
    label: "Sahi bataya",
    sub: "Symptoms correct the",
    icon: ThumbsUp,
    active: "bg-emerald-500 text-white border-emerald-500",
    idle: "bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50",
  },
  {
    id: "partial",
    label: "Thoda sahi",
    sub: "Partial / close",
    icon: Minus,
    active: "bg-amber-500 text-white border-amber-500",
    idle: "bg-white text-amber-700 border-amber-200 hover:bg-amber-50",
  },
  {
    id: "galat",
    label: "Galat bataya",
    sub: "Symptoms wrong the",
    icon: ThumbsDown,
    active: "bg-rose-500 text-white border-rose-500",
    idle: "bg-white text-rose-700 border-rose-200 hover:bg-rose-50",
  },
];

const emptyUni = {
  university_name: "",
  university_course: "",
  university_year: "",
  university_id: "",
  university_email: "",
  university_city: "",
};

/**
 * Website + symptom accuracy + university details feedback.
 */
export default function WebsiteFeedbackPanel({ doctor = null, compact = false }) {
  const profile = getProfile();
  const [verdict, setVerdict] = useState(null);
  const [symptomAccuracy, setSymptomAccuracy] = useState(null);
  const [symptomsTried, setSymptomsTried] = useState("");
  const [expectedCondition, setExpectedCondition] = useState("");
  const [predictedCondition, setPredictedCondition] = useState("");
  const [uni, setUni] = useState(emptyUni);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState(profile?.name || "");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);

  const loadStats = () => {
    getWebsiteFeedbackSummary()
      .then(setSummary)
      .catch(() => {});
    getWebsiteFeedback(10)
      .then((d) => {
        setRecent(d.items || []);
        if (d.summary) setSummary(d.summary);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
  }, []);

  const updateUni = (key, value) => setUni((u) => ({ ...u, [key]: value }));

  const submit = async () => {
    if (!verdict) {
      setError("Pehle website Sahi / Galat choose karo");
      return;
    }
    if (!symptomAccuracy) {
      setError("Symptom checker sahi batata hai ya nahi — choose karo");
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitWebsiteFeedback({
        verdict,
        rating: rating || null,
        comment: comment.trim() || null,
        page: "consult",
        doctor_id: doctor?.id || null,
        doctor_name: doctor?.name || null,
        user_name: userName.trim() || profile?.name || null,
        symptom_accuracy: symptomAccuracy,
        symptoms_tried: symptomsTried.trim() || null,
        expected_condition: expectedCondition.trim() || null,
        predicted_condition: predictedCondition.trim() || null,
        university_name: uni.university_name.trim() || null,
        university_course: uni.university_course.trim() || null,
        university_year: uni.university_year.trim() || null,
        university_id: uni.university_id.trim() || null,
        university_email: uni.university_email.trim() || null,
        university_city: uni.university_city.trim() || null,
      });
      setDone(true);
      loadStats();
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Feedback save nahi hua");
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setDone(false);
    setVerdict(null);
    setSymptomAccuracy(null);
    setSymptomsTried("");
    setExpectedCondition("");
    setPredictedCondition("");
    setUni(emptyUni);
    setRating(0);
    setComment("");
    setError(null);
  };

  const sym = summary?.symptoms;

  return (
    <div className={`card-surface overflow-hidden shadow-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-white shadow-md shrink-0">
          <MessageSquareHeart size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-ink tracking-tight">
            Website & symptom feedback
          </p>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Batao website{" "}
            <span className="font-semibold text-emerald-600">sahi</span> /{" "}
            <span className="font-semibold text-rose-600">galat</span> lagi, symptoms
            correct the ya nahi, aur apni university details.
          </p>
        </div>
        {doctor && (
          <div className="hidden sm:block shrink-0">
            <DoctorAvatar name={doctor.name} specialty={doctor.specialty} size={44} showOnline />
          </div>
        )}
      </div>

      {done ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={24} className="text-emerald-600" />
          </div>
          <p className="text-sm font-bold text-ink">Shukriya! Feedback save ho gaya</p>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Website:{" "}
            <span className={`font-extrabold ${verdict === "sahi" ? "text-emerald-600" : "text-rose-600"}`}>
              {verdict === "sahi" ? "Sahi" : "Galat"}
            </span>
            {" · "}Symptoms:{" "}
            <span
              className={`font-extrabold ${
                symptomAccuracy === "sahi"
                  ? "text-emerald-600"
                  : symptomAccuracy === "partial"
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            >
              {symptomAccuracy === "sahi"
                ? "Sahi bataya"
                : symptomAccuracy === "partial"
                  ? "Thoda sahi"
                  : "Galat bataya"}
            </span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 text-xs font-bold text-accent2 hover:underline"
          >
            Aur feedback do
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. Website verdict */}
          <section>
            <p className="text-[11px] font-bold text-ink mb-2 uppercase tracking-wide">
              1. Website overall
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {VERDICTS.map((v) => {
                const Icon = v.icon;
                const on = verdict === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVerdict(v.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-3 py-3 transition-all active:scale-[0.98] ${
                      on ? v.active : v.idle
                    }`}
                  >
                    <Icon size={20} strokeWidth={2.4} />
                    <span className="text-sm font-extrabold">{v.label}</span>
                    <span className={`text-[10px] font-medium ${on ? "opacity-90" : "opacity-70"}`}>
                      {v.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Symptom accuracy */}
          <section className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5">
            <p className="text-[11px] font-bold text-ink mb-1 uppercase tracking-wide flex items-center gap-1.5">
              <Stethoscope size={13} className="text-sky-600" />
              2. Symptom checker sahi batata hai?
            </p>
            <p className="text-[10px] text-muted mb-2.5 leading-relaxed">
              Jo symptoms aapne check kiye — app ne sahi condition batayi ya galat?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SYMPTOM_OPTS.map((o) => {
                const Icon = o.icon;
                const on = symptomAccuracy === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSymptomAccuracy(o.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-1.5 py-2.5 text-center transition active:scale-[0.98] ${
                      on ? o.active : o.idle
                    }`}
                  >
                    <Icon size={16} strokeWidth={2.4} />
                    <span className="text-[11px] font-extrabold leading-tight">{o.label}</span>
                    <span className={`text-[9px] font-medium leading-tight ${on ? "opacity-90" : "opacity-65"}`}>
                      {o.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 space-y-2">
              <div>
                <label className="text-[10px] font-semibold text-muted">
                  Kaunse symptoms try kiye?
                </label>
                <input
                  value={symptomsTried}
                  onChange={(e) => setSymptomsTried(e.target.value)}
                  placeholder="e.g. Fever, cough, headache"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted">
                    App ne kya bataya?
                  </label>
                  <input
                    value={predictedCondition}
                    onChange={(e) => setPredictedCondition(e.target.value)}
                    placeholder="e.g. Flu / Viral"
                    className="input-field mt-1 text-sm !py-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted">
                    Aapke hisaab se sahi kya tha?
                  </label>
                  <input
                    value={expectedCondition}
                    onChange={(e) => setExpectedCondition(e.target.value)}
                    placeholder="e.g. Dengue / Migraine"
                    className="input-field mt-1 text-sm !py-2"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. University details */}
          <section className="rounded-2xl border border-violet-100 bg-violet-50/50 p-3.5">
            <p className="text-[11px] font-bold text-ink mb-1 uppercase tracking-wide flex items-center gap-1.5">
              <GraduationCap size={13} className="text-violet-600" />
              3. University / college details
            </p>
            <p className="text-[10px] text-muted mb-2.5">
              Student feedback track karne ke liye (optional, but recommended)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted">Your name</label>
                <input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Full name"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted">University / College name</label>
                <input
                  value={uni.university_name}
                  onChange={(e) => updateUni("university_name", e.target.value)}
                  placeholder="e.g. Mumbai University"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted">Course / Branch</label>
                <input
                  value={uni.university_course}
                  onChange={(e) => updateUni("university_course", e.target.value)}
                  placeholder="e.g. B.Tech CSE"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted">Year / Semester</label>
                <input
                  value={uni.university_year}
                  onChange={(e) => updateUni("university_year", e.target.value)}
                  placeholder="e.g. 3rd year"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted">Roll / Student ID</label>
                <input
                  value={uni.university_id}
                  onChange={(e) => updateUni("university_id", e.target.value)}
                  placeholder="e.g. 21CSE045"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted">City</label>
                <input
                  value={uni.university_city}
                  onChange={(e) => updateUni("university_city", e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted">College email (optional)</label>
                <input
                  type="email"
                  value={uni.university_email}
                  onChange={(e) => updateUni("university_email", e.target.value)}
                  placeholder="name@college.edu"
                  className="input-field mt-1 text-sm !py-2"
                />
              </div>
            </div>
          </section>

          {/* Rating + comment */}
          <section>
            <p className="text-[11px] font-semibold text-muted mb-1.5 flex items-center gap-1">
              <Star size={11} /> Overall rating (optional)
            </p>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
                    rating >= n
                      ? "bg-amber-400 border-amber-400 text-white shadow-sm"
                      : "bg-panel2 border-border text-muted hover:border-amber-300"
                  }`}
                  aria-label={`${n} star`}
                >
                  <Star size={15} fill={rating >= n ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <label className="text-[10px] font-semibold text-muted mt-3 block">
              Extra comment
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Kya accha laga / kya fix chahiye?"
              className="input-field mt-1 resize-none text-sm"
            />
          </section>

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <button
            type="button"
            disabled={sending || !verdict || !symptomAccuracy}
            onClick={submit}
            className="w-full btn-primary text-sm py-2.5 disabled:opacity-50"
          >
            {sending ? (
              "Bhej rahe hain…"
            ) : (
              <>
                <Send size={15} /> Feedback bhejo
              </>
            )}
          </button>
        </div>
      )}

      {/* Live stats */}
      {summary && summary.total > 0 && (
        <div className="mt-4 pt-4 border-t border-border/80 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-bold text-ink flex items-center gap-1">
                <BarChart3 size={12} className="text-accent2" />
                Website feedback
              </p>
              <span className="text-[10px] font-semibold text-muted">
                {summary.total} response{summary.total === 1 ? "" : "s"}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-rose-100 overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                style={{
                  width: `${summary.total ? (summary.sahi / summary.total) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] font-bold">
              <span className="text-emerald-600">
                Sahi {summary.sahi} ({summary.sahi_percent || 0}%)
              </span>
              <span className="text-rose-600">Galat {summary.galat}</span>
            </div>
          </div>

          {sym && sym.answered > 0 && (
            <div>
              <p className="text-[11px] font-bold text-ink mb-2 flex items-center gap-1">
                <Stethoscope size={12} className="text-sky-600" />
                Symptom accuracy
              </p>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-400"
                  style={{ width: `${(sym.sahi / sym.answered) * 100}%` }}
                  title="Sahi"
                />
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${(sym.partial / sym.answered) * 100}%` }}
                  title="Partial"
                />
                <div
                  className="h-full bg-rose-400"
                  style={{ width: `${(sym.galat / sym.answered) * 100}%` }}
                  title="Galat"
                />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[10px] font-bold">
                <span className="text-emerald-600">Sahi {sym.sahi}</span>
                <span className="text-amber-600">Partial {sym.partial}</span>
                <span className="text-rose-600">Galat {sym.galat}</span>
                <span className="text-muted font-semibold ml-auto">
                  {sym.sahi_percent}% correct
                </span>
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recent.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-panel2/80 border border-border/60 px-2.5 py-2"
                >
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span
                      className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                        item.verdict === "sahi"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      web {item.verdict}
                    </span>
                    {item.symptom_accuracy && (
                      <span
                        className={`text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                          item.symptom_accuracy === "sahi"
                            ? "bg-sky-100 text-sky-700"
                            : item.symptom_accuracy === "partial"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        sx {item.symptom_accuracy}
                      </span>
                    )}
                    {item.rating ? (
                      <span className="text-[9px] font-bold text-amber-600">{item.rating}★</span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-ink leading-snug">
                    {item.comment || item.symptoms_tried || (
                      <span className="text-muted italic">No comment</span>
                    )}
                  </p>
                  {(item.predicted_condition || item.expected_condition) && (
                    <p className="text-[9px] text-muted mt-0.5">
                      {item.predicted_condition && <>App: {item.predicted_condition}</>}
                      {item.predicted_condition && item.expected_condition && " · "}
                      {item.expected_condition && <>Expected: {item.expected_condition}</>}
                    </p>
                  )}
                  <p className="text-[9px] text-muted mt-0.5">
                    {item.user_name || "Anonymous"}
                    {item.university_name ? ` · ${item.university_name}` : ""}
                    {item.university_course ? ` · ${item.university_course}` : ""}
                    {item.university_year ? ` · ${item.university_year}` : ""}
                    {item.university_id ? ` · ID ${item.university_id}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
