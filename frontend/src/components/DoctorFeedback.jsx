import { useEffect, useRef, useState } from "react";
import {
  Send,
  CheckCircle2,
  MessageSquareHeart,
  Camera,
  ImagePlus,
  Trash2,
  Phone,
  User,
  FileText,
} from "lucide-react";
import { submitDoctorFeedback, getDoctorFeedback } from "../api/client.js";

/** Max original image size: 10MB */
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function readImageAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Please choose an image file (JPG, PNG, or WebP)"));
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      reject(new Error("Photo is too large (maximum 10MB)"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the photo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Doctor feedback for the website: name, photo (up to 10MB), mobile, description.
 */
export function DoctorFeedbackForm({
  initialName = "",
  doctorId = null,
  onDone,
  compact = false,
}) {
  const fileRef = useRef(null);
  const [doctorName, setDoctorName] = useState(initialName || "");
  const [doctorMobile, setDoctorMobile] = useState("");
  const [description, setDescription] = useState("");
  const [photoData, setPhotoData] = useState(null);
  const [photoName, setPhotoName] = useState("");
  const [photoSize, setPhotoSize] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    if (initialName) setDoctorName(initialName);
  }, [initialName]);

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataURL(file);
      setPhotoData(dataUrl);
      setPhotoName(file.name || "doctor-photo.jpg");
      setPhotoSize(file.size);
      setError(null);
    } catch (err) {
      setError(err.message || "Could not add photo");
    }
  };

  const clearPhoto = () => {
    setPhotoData(null);
    setPhotoName("");
    setPhotoSize(0);
  };

  const submit = async () => {
    const name = doctorName.trim();
    const mobile = doctorMobile.trim();
    const desc = description.trim();
    if (!name) {
      setError("Please enter the doctor name");
      return;
    }
    if (!photoData) {
      setError("Please add a doctor photo");
      return;
    }
    if (!mobile) {
      setError("Please enter the doctor mobile number");
      return;
    }
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Please enter a valid mobile number");
      return;
    }
    if (!desc) {
      setError("Please enter a short description");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await submitDoctorFeedback({
        doctor_name: name,
        doctor_mobile: mobile,
        description: desc,
        photo_data: photoData,
        photo_name: photoName || null,
        doctor_id: doctorId || null,
      });
      setSaved(res);
      setDone(true);
      onDone?.(res);
    } catch (e) {
      const detail = e.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : e.message || "Could not save feedback"
      );
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setDone(false);
    setSaved(null);
    setDoctorName(initialName || "");
    setDoctorMobile("");
    setDescription("");
    setPhotoData(null);
    setPhotoName("");
    setPhotoSize(0);
    setError(null);
  };

  if (done && saved) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
        <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
        <p className="text-sm font-bold text-ink">
          Saved — this doctor is now available to book
        </p>
        {saved.photo_data && (
          <img
            src={saved.photo_data}
            alt={saved.doctor_name}
            className="mt-3 mx-auto w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
          />
        )}
        <p className="text-sm font-extrabold text-ink mt-2">{saved.doctor_name}</p>
        <p className="text-xs text-accent2 font-bold mt-0.5 flex items-center justify-center gap-1">
          <Phone size={12} /> {saved.doctor_mobile}
        </p>
        {saved.description && (
          <p className="text-xs text-muted mt-2 leading-relaxed px-2">
            {saved.description}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-3 text-xs font-bold text-accent2 hover:underline"
        >
          Add another doctor
        </button>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-border bg-white ${
        compact ? "p-3.5" : "p-4"
      } shadow-soft space-y-3`}
    >
      {/* Name */}
      <div>
        <label className="text-[11px] font-bold text-ink flex items-center gap-1">
          <User size={12} /> Doctor name *
        </label>
        <input
          value={doctorName}
          onChange={(e) => setDoctorName(e.target.value)}
          placeholder="e.g. Dr. Ananya Sharma"
          className="input-field mt-1 text-sm"
        />
      </div>

      {/* Photo */}
      <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-3">
        <p className="text-[11px] font-bold text-ink mb-1 flex items-center gap-1.5">
          <Camera size={13} className="text-sky-600" />
          Doctor photo *
        </p>
        <p className="text-[10px] text-muted mb-2">
          JPG, PNG, or WebP · up to <span className="font-bold text-ink">10MB</span>
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickPhoto}
        />
        {photoData ? (
          <div className="flex items-center gap-3">
            <img
              src={photoData}
              alt="Doctor preview"
              className="w-20 h-20 rounded-xl object-cover border border-white shadow"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-ink truncate">{photoName}</p>
              {photoSize > 0 && (
                <p className="text-[10px] text-muted mt-0.5">
                  {(photoSize / (1024 * 1024)).toFixed(2)} MB
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="text-[11px] font-bold text-sky-700 hover:underline"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="text-[11px] font-bold text-rose-600 inline-flex items-center gap-1 hover:underline"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white text-sky-700 text-xs font-bold py-3 hover:bg-sky-50 transition"
          >
            <ImagePlus size={16} />
            Choose / upload photo
          </button>
        )}
      </div>

      {/* Mobile */}
      <div>
        <label className="text-[11px] font-bold text-ink flex items-center gap-1">
          <Phone size={12} /> Doctor mobile number *
        </label>
        <input
          type="tel"
          inputMode="tel"
          value={doctorMobile}
          onChange={(e) => setDoctorMobile(e.target.value)}
          placeholder="e.g. 98765 43210"
          className="input-field mt-1 text-sm"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[11px] font-bold text-ink flex items-center gap-1">
          <FileText size={12} /> Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Specialty, clinic, experience, languages, or notes for patients…"
          className="input-field mt-1 resize-none text-sm"
        />
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      <button
        type="button"
        disabled={sending}
        onClick={submit}
        className="w-full btn-primary text-sm py-2.5 disabled:opacity-50"
      >
        {sending ? (
          "Saving…"
        ) : (
          <>
            <Send size={14} /> Save doctor feedback
          </>
        )}
      </button>
    </div>
  );
}

/** Feedback tab — form + saved doctor cards. */
export default function DoctorFeedbackPanel() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [formKey, setFormKey] = useState(0);

  const load = () => {
    getDoctorFeedback({ limit: 40 })
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total ?? (d.items || []).length);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="card-surface p-4 shadow-card">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-sky-500 flex items-center justify-center text-white shadow-md shrink-0">
            <MessageSquareHeart size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-ink">Doctor feedback</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">
              Add a real doctor with <span className="font-semibold text-ink">name</span>,{" "}
              <span className="font-semibold text-ink">photo</span> (up to 10MB),{" "}
              <span className="font-semibold text-ink">mobile</span>, and{" "}
              <span className="font-semibold text-ink">description</span>. After saving,
              they appear under <span className="font-semibold text-emerald-600">Find doctors</span>{" "}
              for free booking or call.
            </p>
          </div>
        </div>

        <DoctorFeedbackForm
          key={formKey}
          onDone={() => {
            load();
            setTimeout(() => setFormKey((k) => k + 1), 800);
          }}
        />
      </div>

      <div className="card-surface p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-ink">Saved doctors</p>
          <span className="text-[10px] font-semibold text-muted">{total}</span>
        </div>

        {items.length === 0 ? (
          <p className="text-xs text-muted">No doctor feedback yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-border bg-panel2/70 p-3"
              >
                {item.photo_data ? (
                  <img
                    src={item.photo_data}
                    alt={item.doctor_name}
                    className="w-14 h-14 rounded-xl object-cover border border-white shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                    <User size={22} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-ink truncate">
                    {item.doctor_name}
                  </p>
                  <a
                    href={`tel:${(item.doctor_mobile || "").replace(/\s/g, "")}`}
                    className="text-xs font-bold text-accent2 inline-flex items-center gap-1 mt-0.5 hover:underline"
                  >
                    <Phone size={12} />
                    {item.doctor_mobile || "—"}
                  </a>
                  {item.description && (
                    <p className="text-[11px] text-muted mt-1 leading-snug line-clamp-3">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
