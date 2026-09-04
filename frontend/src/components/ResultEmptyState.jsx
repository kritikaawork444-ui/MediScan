import { Stethoscope } from "lucide-react";

export default function ResultEmptyState({
  title = "Your result will show up here",
  subtitle = "Pick your symptoms and tap Analyze — a local AI model reads them and shows 2-3 possible causes with a confidence score for each.",
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 bg-panel border border-dashed border-border rounded-xl2 p-8">
      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
        <Stethoscope size={22} className="text-accent" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted mt-1 max-w-[240px]">{subtitle}</p>
      </div>
    </div>
  );
}
