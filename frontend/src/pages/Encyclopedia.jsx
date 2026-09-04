import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { getEncyclopedia, lookupDisease } from "../api/client.js";

const FILTERS = ["All", "Common", "Infection", "Viral", "Bacterial"];

const riskColor = {
  Low: "bg-emerald-500/20 text-emerald-600",
  Moderate: "bg-orange-500/20 text-orange-600",
  High: "bg-red-500/20 text-red-600",
};

export default function Encyclopedia() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    getEncyclopedia(query, filter).then(setItems).catch(() => {});
    setAiResult(null);
    setAiError(null);
  }, [query, filter]);

  const askAI = async () => {
    if (!query.trim()) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const data = await lookupDisease(query.trim());
      setAiResult(data);
    } catch (e) {
      setAiError(
        e.response?.data?.detail ||
          e.message ||
          "Could not look up this condition. Is the backend running?"
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <h2 className="text-xl font-bold">Health Encyclopedia</h2>
        <p className="text-muted text-sm mt-1">
          Explore diseases, symptoms and health conditions.
        </p>

        <div className="flex items-center gap-2 bg-panel border border-border rounded-xl2 px-4 py-3 mt-4">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search diseases, symptoms..."
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted"
          />
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap ${
                filter === f ? "bg-accent text-base font-semibold" : "bg-panel border border-border text-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 mt-4">
          {items.map((c) => (
            <div key={c.name} className="bg-panel border border-border rounded-xl2 p-4">
              <div className="flex items-start justify-between">
                <p className="font-bold">{c.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskColor[c.risk]}`}>
                  {c.risk.toUpperCase()} RISK
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{c.description}</p>
              <p className="text-xs mt-1">
                <span className="text-muted">Symptoms: </span>
                {c.symptoms}
              </p>
              <button className="text-accent text-xs mt-2">Read More →</button>
            </div>
          ))}
        </div>

        {/* Not found in the built-in list -> offer AI lookup */}
        {query.trim() && items.length === 0 && !aiResult && (
          <div className="bg-panel border border-dashed border-accent/40 rounded-xl2 p-4 mt-4 text-center">
            <p className="text-sm text-muted mb-3">
              "{query}" isn't in the built-in list.
            </p>
            <button
              onClick={askAI}
              disabled={aiLoading}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-accent2 to-accent text-white text-sm font-semibold px-4 py-2 rounded-full disabled:opacity-50"
            >
              <Sparkles size={15} />
              {aiLoading ? "Asking AI..." : `Ask AI about "${query}"`}
            </button>
            {aiError && <p className="text-red-600 text-xs mt-2">{aiError}</p>}
          </div>
        )}

        {/* AI-generated result */}
        {aiResult && (
          <div className="bg-panel border border-accent/40 rounded-xl2 p-4 mt-4 mb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-accent" />
                <p className="font-bold">{aiResult.name}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${riskColor[aiResult.risk_level] || "bg-panel2 text-muted"}`}>
                {(aiResult.risk_level || "").toUpperCase()} RISK
              </span>
            </div>
            <p className="text-[10px] text-muted mt-0.5">
              {aiResult.category} {aiResult.source === "cache" ? "· from cache" : "· AI generated"}
            </p>
            <p className="text-xs text-muted mt-2">{aiResult.description}</p>
            <p className="text-xs mt-2">
              <span className="text-muted">Symptoms: </span>
              {aiResult.symptoms}
            </p>
            <p className="text-xs mt-1">
              <span className="text-muted">Causes: </span>
              {aiResult.causes}
            </p>
            <div className="mt-3">
              <p className="text-sm font-semibold mb-1">Treatment / What to do</p>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                {(aiResult.treatment || []).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <p className="text-[10px] text-muted mt-3 italic">{aiResult.disclaimer}</p>
          </div>
        )}

        {!query.trim() && items.length === 0 && (
          <p className="text-muted text-xs mt-4">No conditions found.</p>
        )}
        <div className="mb-4" />
      </div>
    </div>
  );
}
