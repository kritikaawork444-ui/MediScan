import { useRef, useState } from "react";
import {
  Camera,
  BrainCircuit,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Upload,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { analyzeInjury } from "../api/client.js";

export default function InjuryAnalyzer() {
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const data = await analyzeInjury(file);
      setResult(data);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        (typeof detail === "string" ? detail : null) ||
          "Could not analyze this image. Try another photo."
      );
    } finally {
      setLoading(false);
    }
  };

  const severityColor = {
    Low: "text-emerald-600 bg-emerald-500/20",
    Moderate: "text-orange-600 bg-orange-500/20",
    High: "text-red-600 bg-red-500/20",
  };

  const isInjury =
    result &&
    result.is_injury !== false &&
    !(result.injury_type || "").toLowerCase().startsWith("not an injury");

  return (
    <div className="page-enter">
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <BrainCircuit size={20} className="text-rose-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Injury Analyzer</h2>
            <p className="text-muted text-sm mt-0.5">
              Upload a real injury photo — ML estimates type & severity (random photos are rejected)
            </p>
          </div>
        </div>

        <div
          onClick={() => !loading && inputRef.current?.click()}
          className="mt-6 border-2 border-dashed border-accent/40 rounded-3xl flex flex-col items-center justify-center py-14 bg-gradient-to-b from-white to-rose-50/50 cursor-pointer hover:border-accent hover:shadow-card transition-all duration-300 card-hover"
        >
          <div className="bg-accent/20 p-4 rounded-full mb-4">
            <Camera size={26} className="text-accent" />
          </div>
          <p className="text-sm">{loading ? "Running injury ML model…" : "Tap to Upload Image"}</p>
          <p className="text-muted text-xs my-2">or</p>
          <button type="button" className="bg-panel2 border border-border px-5 py-2 rounded-full text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Upload size={14} /> Choose File
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
        <p className="text-center text-muted text-xs mt-2">
          Supported formats: JPG, PNG (Max 10MB)
        </p>
        {error && (
          <div className="flex items-start gap-2 text-red-700 text-xs mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="mt-5 animate-fade-slide-up">
            <h3 className="font-semibold text-sm mb-2">
              {isInjury ? "ML Analysis Result" : "Not recognized as an injury"}
            </h3>

            {!isInjury ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl2 p-4 flex gap-3">
                {preview && (
                  <img src={preview} alt="upload" className="w-24 h-24 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-amber-800 font-bold text-sm">
                    <ShieldAlert size={16} /> Not an injury photo
                  </div>
                  <p className="text-xs text-amber-900/80 mt-1.5 leading-relaxed">
                    {result.injury_type || "This does not look like a body injury."}
                  </p>
                  <p className="text-[11px] text-muted mt-2">
                    Filter confidence {Math.round(result.confidence)}%
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-panel border border-border rounded-xl2 p-3 flex gap-3">
                {preview && (
                  <img src={preview} alt="injury" className="w-24 h-24 rounded-lg object-cover" />
                )}
                <div className="min-w-0">
                  <p className="text-xs text-muted flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" /> Possible injury
                  </p>
                  <p className="font-bold">{result.injury_type}</p>
                  <p className="text-accent text-sm font-semibold mt-1">
                    Confidence {result.confidence}%
                  </p>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${
                      severityColor[result.severity] || "text-muted bg-panel2"
                    }`}
                  >
                    {result.severity}
                  </span>
                </div>
              </div>
            )}

            <div
              className={`border rounded-xl2 p-4 mt-3 mb-4 ${
                isInjury ? "bg-panel border-border" : "bg-amber-50/80 border-amber-100"
              }`}
            >
              <p className="text-sm font-semibold mb-2">
                {isInjury ? "Treatment suggestions" : "What to do"}
              </p>
              <ul className="text-xs text-muted space-y-1">
                {(result.treatment_suggestions || []).map((tip, i) => (
                  <li key={i}>✓ {tip}</li>
                ))}
              </ul>
              <p className="text-[10px] text-muted mt-3 italic">{result.disclaimer}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
