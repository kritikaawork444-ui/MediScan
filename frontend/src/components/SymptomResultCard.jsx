import { Stethoscope, Pill, ShieldAlert, Sparkles, Download } from "lucide-react";
import ConfidenceBar, { confidenceColor } from "./ConfidenceBar.jsx";
import { downloadSymptomReceipt } from "../utils/pdfReceipt.js";
import { useLanguage } from "../context/LanguageContext.jsx";

const ringTone = {
  high: "from-emerald-400 to-green-500 text-emerald-700 ring-emerald-200",
  medium: "from-amber-400 to-orange-500 text-amber-700 ring-amber-200",
  low: "from-rose-400 to-red-500 text-rose-700 ring-rose-200",
};

export default function SymptomResultCard({ result, contextLine, symptoms = [], patientName }) {
  const { t, language } = useLanguage();
  const causes = result.possible_causes?.length
    ? result.possible_causes
    : [{ condition: result.condition, confidence: result.confidence, why: "" }];
  const top = causes[0];
  const rest = causes.slice(1);
  const tone = confidenceColor(top.confidence);

  return (
    <div className="card-surface p-5 mt-5 mb-4 animate-fade-slide-up shadow-card overflow-hidden relative">
      <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-accent/10 blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3 relative">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={11} className="text-accent" /> {t("mostLikelyCause")}
          </p>
          <h4 className="text-lg font-extrabold mt-1 text-ink truncate">{top.condition}</h4>
          {top.why && <p className="text-xs text-muted mt-0.5 leading-relaxed">{top.why}</p>}
        </div>
        <div
          className={`relative w-16 h-16 flex items-center justify-center rounded-2xl bg-gradient-to-br ${ringTone[tone].split(" ").slice(0, 2).join(" ")} text-white shadow-glow shrink-0 animate-pop-in`}
        >
          <span className="text-sm font-extrabold">{Math.round(top.confidence)}%</span>
        </div>
      </div>

      {contextLine && (
        <p className="text-[11px] text-muted mt-3 bg-panel2/80 rounded-xl px-3 py-2 border border-border/60">
          {contextLine}
        </p>
      )}

      {rest.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/70 space-y-3">
          <p className="text-xs font-bold text-muted uppercase tracking-wide">
            {t("otherPossibleCauses")}
          </p>
          {rest.map((c, i) => (
            <div key={i} className="bg-panel2/50 rounded-xl p-3 border border-border/50">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-ink">{c.condition}</span>
              </div>
              <ConfidenceBar value={c.confidence} />
              {c.why && <p className="text-[11px] text-muted mt-1">{c.why}</p>}
            </div>
          ))}
        </div>
      )}

      {result.recommendations?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/70">
          <p className="text-sm font-bold mb-2.5 flex items-center gap-1.5 text-ink">
            <span className="w-7 h-7 rounded-lg bg-accent2/10 text-accent2 flex items-center justify-center">
              <Stethoscope size={14} />
            </span>
            {t("recommendations")}
          </p>
          <ul className="text-xs text-muted space-y-2">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-5 h-5 rounded-full bg-accent2/10 text-accent2 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.treatment?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/70">
          <p className="text-sm font-bold mb-2.5 flex items-center gap-1.5 text-ink">
            <span className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
              <Pill size={14} />
            </span>
            {t("treatmentSolutions")}
          </p>
          <ul className="text-xs text-muted space-y-2">
            {result.treatment.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-border/70 flex gap-2 items-start bg-amber-50/80 rounded-xl p-3 border border-amber-100">
        <ShieldAlert size={14} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-900/80 leading-relaxed">{result.disclaimer}</p>
      </div>

      <button
        type="button"
        onClick={() =>
          downloadSymptomReceipt({ result, symptoms, contextLine, patientName, language })
        }
        className="w-full flex items-center justify-center gap-2 btn-ghost text-xs font-bold py-2.5 mt-3"
      >
        <Download size={14} className="text-accent" />
        {t("downloadPdf")}
      </button>
    </div>
  );
}
