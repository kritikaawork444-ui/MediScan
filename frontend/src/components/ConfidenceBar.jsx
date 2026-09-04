export function confidenceColor(pct) {
  if (pct >= 60) return "high";
  if (pct >= 30) return "medium";
  return "low";
}

const barClasses = {
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

const textClasses = {
  high: "text-high",
  medium: "text-medium",
  low: "text-low",
};

export default function ConfidenceBar({ value, size = "sm" }) {
  const pct = Math.max(0, Math.min(100, value));
  const tone = confidenceColor(pct);
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        className={`flex-1 ${size === "sm" ? "h-1.5" : "h-2"} rounded-full bg-panel2 overflow-hidden`}
      >
        <div
          className={`h-full rounded-full ${barClasses[tone]} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-semibold ${textClasses[tone]} w-9 text-right shrink-0`}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}
