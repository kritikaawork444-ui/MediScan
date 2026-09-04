import { useEffect, useState } from "react";
import { Stethoscope, FileText, Activity } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { getHistory, clearHistory } from "../api/client.js";

const ICONS = { symptom: Stethoscope, report: FileText, injury: Activity };

function groupByDate(items) {
  const groups = {};
  items.forEach((item) => {
    const date = new Date(item.created_at);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const label = isToday ? "Today" : date.toLocaleDateString(undefined, { day: "2-digit", month: "long", year: "numeric" });
    groups[label] = groups[label] || [];
    groups[label].push(item);
  });
  return groups;
}

export default function History() {
  const [items, setItems] = useState([]);

  const load = () => getHistory().then(setItems).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const handleClear = async () => {
    await clearHistory();
    load();
  };

  const grouped = groupByDate(items);

  return (
    <div>
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">History</h2>
            <p className="text-muted text-sm mt-1">View your past analyses and reports.</p>
          </div>
          <button
            onClick={handleClear}
            className="text-xs bg-panel border border-border px-3 py-1.5 rounded-full"
          >
            Clear All
          </button>
        </div>

        {Object.keys(grouped).length === 0 && (
          <p className="text-muted text-xs mt-6">No history yet. Run a symptom check, report scan, or injury analysis to see it here.</p>
        )}

        {Object.entries(grouped).map(([label, entries]) => (
          <div key={label} className="mt-5">
            <p className="text-xs text-muted mb-2">{label}</p>
            <div className="space-y-2">
              {entries.map((item) => {
                const Icon = ICONS[item.analysis_type] || FileText;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-panel border border-border rounded-xl2 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-panel2 p-2 rounded-lg text-accent">
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm">{item.title}</p>
                        {item.input_summary && (
                          <p className="text-xs text-muted">{item.input_summary}</p>
                        )}
                        <p className="text-emerald-600 text-xs">
                          {item.result_label}
                          {item.confidence ? ` (${item.confidence}% Match)` : ""}
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
