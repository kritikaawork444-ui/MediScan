import { Stethoscope, Pill, ShieldAlert, Sparkles, Download, Users } from "lucide-react";
import ConfidenceBar, { confidenceColor } from "./ConfidenceBar.jsx";
import { downloadSymptomReceipt } from "../utils/pdfReceipt.js";

const ringColor = {
  high: "border-high text-high",
  medium: "border-medium text-medium",
  low: "border-low text-low",
};

function genderBadgeClass(g) {
  const v = (g || "").toLowerCase();
  if (v === "female") return "bg-pink-50 border-pink-200 text-pink-800";
  if (v === "male") return "bg-sky-50 border-sky-200 text-sky-800";
  return "bg-slate-50 border-slate-200 text-slate-700";
}

export default function SymptomResultCard({ result, contextLine, symptoms = [], patientName }) {
  const causes = result.possible_causes?.length
    ? result.possible_causes
    : [{ condition: result.condition, confidence: result.confidence, why: "" }];
  const top = causes[0];
  const rest = causes.slice(1);
  const tone = confidenceColor(top.confidence);
  const gender = result.gender;
  const genderNotes = result.gender_notes;

  return (
    <div className="bg-panel border border-border rounded-xl2 p-4 mt-5 mb-4 animate-fade-slide-up shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted uppercase tracking-wide flex items-center gap-1">
            <Sparkles size={11} className="text-accent" /> Most likely cause
          </p>
          <h4 className="text-lg font-bold mt-1 truncate">{top.condition}</h4>
          {top.why && <p className="text-xs text-muted mt-0.5">{top.why}</p>}
        </div>
        <div
          className={`relative w-14 h-14 flex items-center justify-center rounded-full border-4 shrink-0 animate-pop-in ${ringColor[tone]}`}
        >
          <span className="text-sm font-bold">{Math.round(top.confidence)}%</span>
        </div>
      </div>

      {contextLine && <p className="text-[11px] text-muted mt-2">{contextLine}</p>}

      {gender && gender !== "unknown" && (
        <div
          className={`mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${genderBadgeClass(
            gender
          )}`}
        >
          <Users size={12} />
          Treatment for: {gender}
        </div>
      )}

      {rest.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border space-y-2.5">
          <p className="text-xs font-semibold text-muted">Other possible causes</p>
          {rest.map((c, i) => (
            <div key={i}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm">{c.condition}</span>
              </div>
              <ConfidenceBar value={c.confidence} />
              {c.why && <p className="text-[11px] text-muted mt-0.5">{c.why}</p>}
            </div>
          ))}
        </div>
      )}

      {genderNotes ? (
        <div
          className={`mt-4 pt-4 border-t border-border rounded-xl p-3 ${
            (gender || "").toLowerCase() === "female"
              ? "bg-pink-50/80 border border-pink-100"
              : (gender || "").toLowerCase() === "male"
                ? "bg-sky-50/80 border border-sky-100"
                : "bg-panel2 border border-border"
          }`}
        >
          <p className="text-sm font-semibold mb-1.5 flex items-center gap-1.5">
            <Users size={14} className="text-accent2" />
            {(gender || "").toLowerCase() === "male"
              ? "Male-specific notes"
              : (gender || "").toLowerCase() === "female"
                ? "Female-specific notes"
                : "Gender notes"}
          </p>
          <p className="text-xs text-ink leading-relaxed">{genderNotes}</p>
        </div>
      ) : null}

      {result.recommendations?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Stethoscope size={14} className="text-accent2" /> Recommendations
          </p>
          <ul className="text-xs text-muted space-y-1.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent2 mt-1.5 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.treatment?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Pill size={14} className="text-accent" /> Treatment & solutions
            {gender && gender !== "unknown" ? (
              <span className="text-[10px] font-bold text-accent2 normal-case">({gender})</span>
            ) : null}
          </p>
          <ul className="text-xs text-muted space-y-1.5">
            {result.treatment.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border flex gap-2 items-start">
        <ShieldAlert size={13} className="text-medium shrink-0 mt-0.5" />
        <p className="text-[10px] text-muted italic">{result.disclaimer}</p>
      </div>

      <button
        type="button"
        onClick={() => downloadSymptomReceipt({ result, symptoms, contextLine, patientName })}
        className="w-full flex items-center justify-center gap-2 bg-panel2 hover:bg-border/60 text-ink text-xs font-semibold py-2.5 rounded-xl mt-3 transition-colors"
      >
        <Download size={14} className="text-accent" />
        Download PDF Receipt
      </button>
    </div>
  );
}
