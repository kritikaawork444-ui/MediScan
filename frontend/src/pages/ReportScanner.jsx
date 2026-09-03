import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText, BrainCircuit } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { scanReport, getHistory } from "../api/client.js";
import { formatShortDate } from "../utils/datetime.js";

export default function ReportScanner() {
  const [recent, setRecent] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    getHistory()
      .then((all) => setRecent(all.filter((a) => a.analysis_type === "report").slice(0, 3)))
      .catch(() => {});
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await scanReport(file);
      navigate("/reports/result", { state: { result, filename: file.name } });
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        (typeof detail === "string" ? detail : null) ||
          "Could not analyze this report. Try another file."
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-enter">
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <BrainCircuit size={20} className="text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Report Scanner</h2>
            <p className="text-muted text-sm mt-0.5">
              Upload a lab report — ML reads values & flags risk patterns offline
            </p>
          </div>
        </div>

        <div
          onClick={() => inputRef.current.click()}
          className="mt-6 border-2 border-dashed border-violet-300/70 rounded-3xl flex flex-col items-center justify-center py-14 bg-gradient-to-b from-white to-violet-50/50 cursor-pointer hover:border-violet-400 hover:shadow-card transition-all duration-300 card-hover"
        >
          <div className="bg-panel2 p-4 rounded-2xl mb-4">
            <UploadCloud size={28} className="text-accent2" />
          </div>
          <p className="text-sm">{uploading ? "Running report ML model…" : "Drag & Drop your file here"}</p>
          <p className="text-muted text-xs my-2">or</p>
          <button type="button" className="bg-panel2 border border-border px-5 py-2 rounded-full text-sm">
            Browse File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.txt"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
        <p className="text-center text-muted text-xs mt-2">
          Supported: PDF, JPG, PNG, TXT (Max 10MB) — text PDFs work best
        </p>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}

        <div className="flex items-center justify-between mt-7 mb-2">
          <h3 className="font-semibold text-sm">Recent Scans</h3>
          <button type="button" onClick={() => navigate("/history")} className="text-accent text-xs">
            View all
          </button>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-muted text-xs">No scans yet.</p>}
          {recent.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 bg-panel border border-border rounded-xl2 p-3"
            >
              <div className="bg-red-500/20 text-red-600 p-2 rounded-lg">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-sm">{r.title}</p>
                <p className="text-muted text-xs">
                  {r.result_label} · {formatShortDate(r.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
