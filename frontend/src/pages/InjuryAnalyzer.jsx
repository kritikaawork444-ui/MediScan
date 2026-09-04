import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { analyzeInjury } from "../api/client.js";

/** Shrink phone photos before upload — big JPGs make injury API feel slow. */
function compressImage(file, { maxSide = 1024, quality = 0.82 } = {}) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith("image/")) {
      resolve(file);
      return;
    }
    // Small files: skip
    if (file.size < 400_000) {
      resolve(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const scale = Math.min(1, maxSide / Math.max(width, height));
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const name = (file.name || "injury.jpg").replace(/\.\w+$/, ".jpg");
          resolve(new File([blob], name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function InjuryAnalyzer() {
  const inputRef = useRef();
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");

  const handleFile = async (file) => {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setLoading(true);
    setStatus("Preparing photo…");
    try {
      const compact = await compressImage(file);
      setStatus("Running injury ML…");
      const data = await analyzeInjury(compact);
      setResult(data);
      setStatus("");
    } catch (e) {
      setError(e.response?.data?.detail || "Could not analyze this image. Try another photo.");
      setStatus("");
    } finally {
      setLoading(false);
    }
  };

  const severityColor = {
    Low: "text-emerald-600 bg-emerald-500/20",
    Moderate: "text-orange-600 bg-orange-500/20",
    High: "text-red-600 bg-red-500/20",
  };

  return (
    <div>
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <h2 className="text-xl font-bold">Injury Analyzer</h2>
        <p className="text-muted text-sm mt-1">
          Upload a clear close-up of the injury. First run may take a few seconds while ML loads.
        </p>

        <div
          onClick={() => !loading && inputRef.current.click()}
          className="mt-6 border-2 border-dashed border-accent/40 rounded-xl2 flex flex-col items-center justify-center py-14 bg-panel cursor-pointer"
        >
          <div className="bg-accent/20 p-4 rounded-full mb-4">
            <Camera size={26} className="text-accent" />
          </div>
          <p className="text-sm">
            {loading ? status || "Analyzing image…" : "Tap to Upload Image"}
          </p>
          <p className="text-muted text-xs my-2">or</p>
          <button
            type="button"
            disabled={loading}
            className="bg-panel2 border border-border px-5 py-2 rounded-full text-sm disabled:opacity-50"
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            disabled={loading}
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
        <p className="text-center text-muted text-xs mt-2">
          JPG/PNG · auto-compressed · max 10MB · well-lit close-up works best
        </p>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}

        {result && (
          <div className="mt-5">
            <h3 className="font-semibold text-sm mb-2">Analysis Result</h3>
            <div className="bg-panel border border-border rounded-xl2 p-3 flex gap-3">
              {preview && (
                <img src={preview} alt="injury" className="w-24 h-24 rounded-lg object-cover" />
              )}
              <div>
                <p className="text-xs text-muted">Possible Injury</p>
                <p className="font-bold">{result.injury_type}</p>
                <p className="text-accent text-sm font-semibold mt-1">
                  Confidence {result.confidence}%
                </p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block ${severityColor[result.severity] || "text-muted bg-panel2"}`}
                >
                  {result.severity}
                </span>
              </div>
            </div>

            <div className="bg-panel border border-border rounded-xl2 p-4 mt-3 mb-4">
              <p className="text-sm font-semibold mb-2">Treatment Suggestions</p>
              <ul className="text-xs text-muted space-y-1">
                {result.treatment_suggestions.map((t, i) => (
                  <li key={i}>✓ {t}</li>
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
