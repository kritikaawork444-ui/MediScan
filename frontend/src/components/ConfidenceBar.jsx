export function confidenceColor(pct) {
  if (pct >= 60) return "high";
  if (pct >= 30) return "medium";
  return "low";
}

const barClasses = {
  high: "bg-gradient-to-r from-emerald-400 to-green-500",
  medium: "bg-gradient-to-r from-amber-400 to-orange-500",
  low: "bg-gradient-to-r from-rose-400 to-red-500",
};

const textClasses = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-rose-600",
};

export default function ConfidenceBar({ value, size = "sm" }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = confidenceColor(pct);
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className={`flex-1 ${size === "sm" ? "h-2" : "h-2.5"} rounded-full bg-panel2 overflow-hidden shadow-inner`}
      >
        <div
          className={`h-full rounded-full ${barClasses[tone]} transition-all duration-700 ease-out shadow-sm`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${textClasses[tone]} w-9 text-right shrink-0`}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}
