import { Stethoscope, Sparkles } from "lucide-react";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ResultEmptyState({ title, subtitle }) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center text-center gap-3 card-surface border-dashed border-2 border-border/80 rounded-3xl p-8 bg-gradient-to-b from-white to-panel2/40">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl animate-pulse-soft" />
        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent2 flex items-center justify-center shadow-glow">
          <Stethoscope size={24} className="text-white" />
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-ink flex items-center justify-center gap-1.5">
          <Sparkles size={14} className="text-accent" />
          {title || t("emptyResultTitle")}
        </p>
        <p className="text-xs text-muted mt-1.5 max-w-[260px] leading-relaxed">
          {subtitle || t("emptyResultSubtitle")}
        </p>
      </div>
    </div>
  );
}
