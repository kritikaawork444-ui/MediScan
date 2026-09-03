import { useEffect, useState } from "react";
import { Stethoscope, FileText, Activity, Trash2 } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { getHistory, clearHistory, deleteHistoryEntry } from "../api/client.js";
import {
  formatHistoryDateLabel,
  formatHistoryTime,
  parseApiDate,
} from "../utils/datetime.js";

const ICONS = { symptom: Stethoscope, report: FileText, injury: Activity };

function groupByDate(items) {
  const groups = {};
  const order = [];
  items.forEach((item) => {
    const label = formatHistoryDateLabel(item.created_at) || "Unknown";
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(item);
  });
  // Keep API order (newest first) within each day; group order follows first appearance
  return order.map((label) => [label, groups[label]]);
}

export default function History() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    getHistory()
      .then((data) => {
        const sorted = [...(data || [])].sort((a, b) => {
          const da = parseApiDate(a.created_at)?.getTime() || 0;
          const db = parseApiDate(b.created_at)?.getTime() || 0;
          return db - da;
        });
        setItems(sorted);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleClear = async () => {
    await clearHistory();
    load();
  };

  const handleDelete = async (id) => {
    try {
      await deleteHistoryEntry(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch {
      /* ignore */
    }
  };

  const grouped = groupByDate(items);

  return (
    <div className="page-enter">
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">History</h2>
            <p className="text-muted text-sm mt-1">
              Past analyses with your local time.
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs btn-ghost !px-3 !py-1.5"
            >
              Clear All
            </button>
          )}
        </div>

        {loading && <p className="text-muted text-xs mt-6 animate-pulse">Loading history…</p>}

        {!loading && grouped.length === 0 && (
          <p className="text-muted text-xs mt-6">
            No history yet. Run a symptom check, report scan, or injury analysis to see it here.
          </p>
        )}

        {grouped.map(([label, entries]) => (
          <div key={label} className="mt-5">
            <p className="text-xs text-muted mb-2 font-medium">{label}</p>
            <div className="space-y-2">
              {entries.map((item) => {
                const Icon = ICONS[item.analysis_type] || FileText;
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 card-surface p-3.5 card-hover"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-accent2/20 text-accent2 flex items-center justify-center shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{item.title}</p>
                        {item.input_summary && (
                          <p className="text-xs text-muted truncate">{item.input_summary}</p>
                        )}
                        <p className="text-emerald-600 text-xs">
                          {item.result_label}
                          {item.confidence ? ` (${item.confidence}% Match)` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <p className="text-[10px] text-muted whitespace-nowrap">
                        {formatHistoryTime(item.created_at)}
                      </p>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted hover:text-red-500 p-1 rounded"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
