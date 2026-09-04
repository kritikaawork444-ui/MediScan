import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { scanReport, getHistory } from "../api/client.js";

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
      setError(e.response?.data?.detail || "Could not analyze this report. Try another file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10">
        <h2 className="text-xl font-bold">Report Scanner</h2>
        <p className="text-muted text-sm mt-1">
          Upload your medical report and get AI insights instantly.
        </p>

        <div
          onClick={() => inputRef.current.click()}
          className="mt-6 border-2 border-dashed border-accent2/40 rounded-xl2 flex flex-col items-center justify-center py-14 bg-panel cursor-pointer"
        >
          <div className="bg-panel2 p-4 rounded-2xl mb-4">
            <UploadCloud size={28} className="text-accent2" />
          </div>
          <p className="text-sm">{uploading ? "Analyzing report..." : "Drag & Drop your file here"}</p>
          <p className="text-muted text-xs my-2">or</p>
          <button className="bg-panel2 border border-border px-5 py-2 rounded-full text-sm">
            Browse File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
        </div>
        <p className="text-center text-muted text-xs mt-2">
          Supported formats: PDF, JPG, PNG (Max 10MB)
        </p>
        {error && <p className="text-red-600 text-xs mt-2 text-center">{error}</p>}

        <div className="flex items-center justify-between mt-7 mb-2">
          <h3 className="font-semibold text-sm">Recent Scans</h3>
          <button onClick={() => navigate("/history")} className="text-accent text-xs">
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
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
