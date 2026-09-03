import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import TopBar from "../components/TopBar.jsx";

export default function ReportSummary() {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state?.result) {
    return (
      <div>
        <TopBar showBack />
        <div className="px-5 md:px-8 lg:px-10">
          <p className="text-muted text-sm">No report analyzed yet.</p>
          <button onClick={() => navigate("/reports")} className="text-accent text-sm mt-2">
            Go scan a report
          </button>
        </div>
      </div>
    );
  }

  const { result, filename } = state;

  return (
    <div className="page-enter">
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Report Summary</h2>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-2 py-1 rounded-full">
            Analysis Complete
          </span>
        </div>
        <p className="text-muted text-sm mt-1">{filename}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {result.metrics.map((m, i) => (
            <div key={i} className="bg-panel border border-border rounded-xl2 p-3">
              <p className="text-xs text-muted">{m.name}</p>
              <p className="font-bold">{m.value}</p>
              <p
                className={`text-xs ${
                  m.status === "Normal" ? "text-emerald-600" : "text-orange-600"
                }`}
              >
                {m.status}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-panel border border-border rounded-xl2 p-4 mt-4 flex items-start gap-3">
          <CheckCircle2 className="text-emerald-600 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-semibold">ML Findings</p>
            <p className="text-xs text-muted mt-1">{result.findings}</p>
          </div>
        </div>

        <div className="bg-panel border border-border rounded-xl2 p-4 mt-4">
          <p className="text-sm font-semibold mb-2">Confidence Score</p>
          <p className="text-2xl font-bold text-accent">{result.confidence}%</p>
          <div className="w-full h-2 bg-panel2 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent2 to-accent"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        <div className="bg-panel border border-border rounded-xl2 p-4 mt-4 mb-4">
          <p className="text-sm font-semibold mb-2">Recommendations</p>
          <ul className="text-xs text-muted space-y-1 list-disc list-inside">
            {result.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="text-[10px] text-muted mt-3 italic">{result.disclaimer}</p>
        </div>
      </div>
    </div>
  );
}
