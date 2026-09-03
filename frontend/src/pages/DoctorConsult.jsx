import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Star,
  Video,
  Building2,
  Clock,
  Stethoscope,
  CheckCircle2,
  X,
  Calendar,
  Phone,
  User,
  AlertTriangle,
  BadgeCheck,
  Gift,
  MessageSquareHeart,
} from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import DoctorAvatar, { DoctorHeroFloat } from "../components/DoctorAvatar.jsx";
import DoctorFeedbackPanel from "../components/DoctorFeedback.jsx";
import {
  getConsultSpecialties,
  getDoctors,
  bookConsult,
  getConsultBookings,
  cancelConsultBooking,
} from "../api/client.js";
import { getProfile } from "../utils/profile.js";
import { formatDateTime } from "../utils/datetime.js";
import { addNotification } from "../utils/notifications.js";
import { useLanguage } from "../context/LanguageContext.jsx";
import LanguageToggle from "../components/LanguageToggle.jsx";

const MODES = [
  { id: "all", label: "All" },
  { id: "online", label: "Online", icon: Video },
  { id: "clinic", label: "Clinic", icon: Building2 },
];

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function modeLabel(mode) {
  if (mode === "online") return "Online video";
  if (mode === "clinic") return "In-clinic";
  return "Online & clinic";
}

function statusStyle(status) {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  if (s === "completed") return "bg-sky-100 text-sky-700 border-sky-200";
  return "bg-amber-100 text-amber-800 border-amber-200";
}

export default function DoctorConsult() {
  const profile = getProfile();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState("find"); // find | bookings | feedback
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [mode, setMode] = useState("all");
  const [specialties, setSpecialties] = useState(["All"]);
  const [doctors, setDoctors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(null);
  const [form, setForm] = useState(() => ({
    patient_name: profile.name || "",
    patient_phone: profile.phone || "",
    patient_email: profile.email || "",
    patient_age: "",
    patient_gender: profile.gender || "",
    mode: "online",
    preferred_date: tomorrowISO(),
    preferred_slot: "",
    reason: "",
    symptoms: "",
    notes: "",
  }));

  const loadDoctors = () => {
    setLoading(true);
    setError(null);
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (specialty && specialty !== "All") params.specialty = specialty;
    if (mode !== "all") params.mode = mode;
    getDoctors(params)
      .then(setDoctors)
      .catch((e) => setError(e.response?.data?.detail || e.message || "Could not load doctors"))
      .finally(() => setLoading(false));
  };

  const loadBookings = () => {
    getConsultBookings()
      .then(setBookings)
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    getConsultSpecialties()
      .then((d) => setSpecialties(["All", ...(d.specialties || [])]))
      .catch(() => {});
    loadDoctors();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadDoctors, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, specialty, mode]);

  const openBook = (doc) => {
    setSelected(doc);
    setBooked(null);
    const preferredMode =
      doc.mode === "clinic" ? "clinic" : doc.mode === "online" ? "online" : "online";
    setForm((f) => ({
      ...f,
      mode: preferredMode,
      preferred_slot: (doc.slots && doc.slots[2]) || "10:00 AM",
      patient_name: f.patient_name || profile.name || "",
      patient_phone: f.patient_phone || profile.phone || "",
      patient_email: f.patient_email || profile.email || "",
      patient_gender: f.patient_gender || profile.gender || "",
    }));
  };

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submitBooking = async () => {
    if (!selected) return;
    if (!form.patient_name.trim()) {
      setError("Patient name is required");
      return;
    }
    setBooking(true);
    setError(null);
    try {
      const result = await bookConsult({
        doctor_id: selected.id,
        ...form,
      });
      setBooked(result);
      loadBookings();
      addNotification({
        title: t("notifBookingTitle"),
        body: `${result.doctor_name || selected.name} · ${result.preferred_date || ""} ${result.preferred_slot || ""}`.trim(),
        type: "booking",
        href: "/consult",
      });
    } catch (e) {
      setError(e.response?.data?.detail || e.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelConsultBooking(id);
      loadBookings();
    } catch {
      /* ignore */
    }
  };

  const availableModes = useMemo(() => {
    if (!selected) return ["online", "clinic"];
    if (selected.mode === "online") return ["online"];
    if (selected.mode === "clinic") return ["clinic"];
    return ["online", "clinic"];
  }, [selected]);

  return (
    <div className="page-enter">
      <TopBar />
      <div className="px-5 md:px-8 lg:px-10 pb-8">
        <LanguageToggle className="mb-3" />
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-600 p-5 md:p-6 text-white shadow-float mb-5">
          <div className="absolute -right-6 -top-6 w-36 h-36 rounded-full bg-white/15 blur-2xl animate-pulse-soft" />
          <div className="absolute left-1/2 bottom-0 w-40 h-20 rounded-full bg-sky-300/20 blur-2xl" />
          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/15 border border-white/25 rounded-full px-2.5 py-1 mb-2">
                <Stethoscope size={11} /> Live doctors
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">Doctor Consult</h2>
              <p className="text-xs md:text-sm text-white/90 flex items-center gap-1.5 font-medium mt-1">
                <Gift size={13} />
                100% free — online video or clinic visit
              </p>
              <p className="text-[11px] text-white/75 mt-2 hidden sm:block">
                Real doctors with mobile numbers — book a free slot or call directly.
              </p>
            </div>
            {/* Animated doctor photos in hero */}
            <div className="shrink-0 relative">
              <div className="absolute inset-0 blur-xl bg-white/20 rounded-full scale-125" />
              <DoctorHeroFloat className="relative" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 sm:gap-2 mt-1 p-1 rounded-2xl bg-white/70 border border-border/70 shadow-soft backdrop-blur">
          {[
            { id: "find", label: t("findDoctors") },
            { id: "bookings", label: `${t("bookings")}${bookings.length ? ` (${bookings.length})` : ""}` },
            { id: "feedback", label: t("feedback"), icon: MessageSquareHeart },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setSelected(null);
                setBooked(null);
                setError(null);
                if (t.id === "bookings") loadBookings();
              }}
              className={`flex-1 py-2.5 rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 inline-flex items-center justify-center gap-1 ${
                tab === t.id
                  ? "bg-gradient-to-r from-accent to-accent2 text-white shadow-glow"
                  : "text-muted hover:text-ink"
              }`}
            >
              {t.icon && <t.icon size={13} className="shrink-0" />}
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-3 mt-4">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{typeof error === "string" ? error : JSON.stringify(error)}</span>
          </div>
        )}

        {/* FIND TAB */}
        {tab === "find" && !selected && (
          <div className="mt-5 space-y-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search doctor, specialty, hospital…"
                className="w-full input-field !rounded-full pl-9 pr-4 shadow-soft"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      mode === m.id
                        ? "bg-accent/10 border-accent text-accent2"
                        : "bg-panel border-border text-muted"
                    }`}
                  >
                    {Icon && <Icon size={12} />}
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {specialties.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialty(s)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    specialty === s
                      ? "bg-gradient-to-r from-accent to-accent2 text-white border-transparent"
                      : "bg-panel border-border text-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {loading && <p className="text-sm text-muted animate-pulse">Loading doctors…</p>}

            {!loading && doctors.length === 0 && (
              <p className="text-sm text-muted">No doctors match your filters.</p>
            )}

            <div className="space-y-3 stagger">
              {doctors.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="card-surface p-4 card-hover overflow-hidden relative"
                  style={{ animationDelay: `${Math.min(idx, 8) * 0.05}s` }}
                >
                  <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-accent/5 pointer-events-none" />
                  <div className="flex gap-3.5 relative">
                    {/* Real doctor photo if available, else avatar */}
                    <div className="doctor-photo-frame shrink-0 self-start">
                      <div className="doctor-photo-frame-inner w-[72px] h-[72px] sm:w-20 sm:h-20">
                        {doc.photo_data ? (
                          <img
                            src={doc.photo_data}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DoctorAvatar
                            name={doc.name}
                            specialty={doc.specialty}
                            size={80}
                            showOnline
                          />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-sm flex items-center gap-1 text-ink">
                            {doc.name}
                            <BadgeCheck size={14} className="text-accent shrink-0" />
                          </p>
                          <p className="text-xs text-accent2 font-semibold">{doc.specialty}</p>
                          <p className="text-[11px] text-muted mt-0.5">{doc.qualification}</p>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-amber-600 shrink-0 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
                          <Star size={12} fill="currentColor" />
                          {doc.rating}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted">
                        <span className="font-medium text-ink/70">{doc.experience_years}+ yrs</span>
                        <span className="truncate">{doc.hospital}</span>
                        <span>{doc.city}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel2 border border-border text-muted">
                          {modeLabel(doc.mode)}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-panel2 border border-border text-muted flex items-center gap-0.5">
                          <Clock size={10} /> {doc.available_days}
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                          FREE
                        </span>
                        {doc.phone && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500 text-white shadow-sm">
                            {t("realCall")}
                          </span>
                        )}
                      </div>

                      {doc.phone && (
                        <a
                          href={`tel:${String(doc.phone).replace(/\s/g, "")}`}
                          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent2 hover:underline"
                        >
                          <Phone size={13} />
                          {doc.phone}
                        </a>
                      )}

                      <p className="text-xs text-muted mt-2 line-clamp-2 leading-relaxed">{doc.about}</p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openBook(doc)}
                          className="flex-1 sm:flex-none btn-primary text-xs px-4 py-2"
                        >
                          {t("bookFree")}
                        </button>
                        {doc.phone && (
                          <a
                            href={`tel:${String(doc.phone).replace(/\s/g, "")}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full border border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 transition"
                          >
                            <Phone size={13} />
                            {t("callDoctor")}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOOKING FORM */}
        {tab === "find" && selected && !booked && (
          <div className="mt-5 animate-fade-slide-up">
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setError(null);
              }}
              className="text-xs text-accent mb-3"
            >
              ← Back to doctors
            </button>

            <div className="card-surface p-4 mb-4 shadow-card flex items-center gap-4">
              <div className="doctor-photo-frame shrink-0">
                <div className="doctor-photo-frame-inner w-[88px] h-[88px]">
                  {selected.photo_data ? (
                    <img
                      src={selected.photo_data}
                      alt={selected.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DoctorAvatar
                      name={selected.name}
                      specialty={selected.specialty}
                      size={88}
                      showOnline
                    />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-ink">{selected.name}</p>
                <p className="text-xs text-accent2 font-semibold">{selected.specialty}</p>
                <p className="text-[11px] text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span>{selected.hospital}</span>
                  <span className="font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px]">
                    FREE
                  </span>
                  {selected.phone && (
                    <span className="font-extrabold px-2 py-0.5 rounded-full bg-sky-500 text-white text-[10px]">
                      REAL
                    </span>
                  )}
                </p>
                {selected.phone && (
                  <a
                    href={`tel:${String(selected.phone).replace(/\s/g, "")}`}
                    className="text-[12px] font-bold text-accent2 mt-1 inline-flex items-center gap-1 hover:underline"
                  >
                    <Phone size={12} /> {selected.phone}
                  </a>
                )}
                <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                  <Star size={11} className="text-amber-500" fill="currentColor" />
                  {selected.rating} · {selected.experience_years}+ yrs exp
                </p>
              </div>
            </div>

            <div className="card-surface p-4 space-y-3 shadow-card">
              <p className="text-sm font-semibold">Patient details</p>

              <div>
                <label className="text-[11px] text-muted flex items-center gap-1">
                  <User size={11} /> Full name *
                </label>
                <input
                  value={form.patient_name}
                  onChange={(e) => updateForm("patient_name", e.target.value)}
                  className="input-field mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted flex items-center gap-1">
                    <Phone size={11} /> Phone
                  </label>
                  <input
                    value={form.patient_phone}
                    onChange={(e) => updateForm("patient_phone", e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted">Age</label>
                  <input
                    value={form.patient_age}
                    onChange={(e) => updateForm("patient_age", e.target.value)}
                    placeholder="e.g. 28"
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted">Gender</label>
                  <select
                    value={form.patient_gender}
                    onChange={(e) => updateForm("patient_gender", e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted">Email</label>
                  <input
                    type="email"
                    value={form.patient_email}
                    onChange={(e) => updateForm("patient_email", e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted">Consult mode</label>
                <div className="flex gap-2 mt-1">
                  {availableModes.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateForm("mode", m)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition ${
                        form.mode === m
                          ? "bg-accent/10 border-accent text-accent2"
                          : "bg-panel2 border-border text-muted"
                      }`}
                    >
                      {m === "online" ? <Video size={13} /> : <Building2 size={13} />}
                      {m === "online" ? "Online" : "Clinic"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-muted flex items-center gap-1">
                    <Calendar size={11} /> Date
                  </label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateForm("preferred_date", e.target.value)}
                    className="input-field mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted flex items-center gap-1">
                    <Clock size={11} /> Slot
                  </label>
                  <select
                    value={form.preferred_slot}
                    onChange={(e) => updateForm("preferred_slot", e.target.value)}
                    className="input-field mt-1"
                  >
                    <option value="">Select…</option>
                    {(selected.slots || []).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted">Reason for visit</label>
                <input
                  value={form.reason}
                  onChange={(e) => updateForm("reason", e.target.value)}
                  placeholder="e.g. Persistent fever, skin rash…"
                  className="input-field mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted">Symptoms (optional)</label>
                <textarea
                  value={form.symptoms}
                  onChange={(e) => updateForm("symptoms", e.target.value)}
                  rows={2}
                  placeholder="Fever, cough, body ache…"
                  className="input-field mt-1 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted">Notes for doctor (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  rows={2}
                  placeholder="Ongoing medicines, allergies…"
                  className="input-field mt-1 resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-sm">
                <span className="text-muted">Consultation fee</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <Gift size={14} /> FREE
                </span>
              </div>

              <button
                type="button"
                disabled={booking}
                onClick={submitBooking}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {booking ? "Booking…" : "Confirm free booking"}
              </button>
              <p className="text-[10px] text-muted text-center">
                100% free consult — no payment required. For emergencies call local ER services.
              </p>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {tab === "find" && booked && (
          <div className="mt-5 card-surface p-6 text-center animate-fade-slide-up shadow-card">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={28} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold">Consult booked!</h3>
            <p className="text-sm text-muted mt-1">
              #{booked.id} with <strong>{booked.doctor_name}</strong>
            </p>
            <div className="text-left bg-panel2 rounded-xl p-4 mt-4 text-xs space-y-1.5">
              <p>
                <span className="text-muted">Specialty:</span> {booked.doctor_specialty}
              </p>
              {booked.doctor_phone && (
                <p className="flex items-center gap-1 flex-wrap">
                  <span className="text-muted">Doctor mobile:</span>{" "}
                  <a
                    href={`tel:${String(booked.doctor_phone).replace(/\s/g, "")}`}
                    className="font-bold text-accent2 hover:underline"
                  >
                    {booked.doctor_phone}
                  </a>
                </p>
              )}
              <p>
                <span className="text-muted">Patient:</span> {booked.patient_name}
              </p>
              <p>
                <span className="text-muted">Mode:</span>{" "}
                {booked.mode === "online" ? "Online video" : "In-clinic"}
              </p>
              <p>
                <span className="text-muted">When:</span> {booked.preferred_date} ·{" "}
                {booked.preferred_slot}
              </p>
              <p>
                <span className="text-muted">Fee:</span>{" "}
                <span className="text-emerald-600 font-semibold">FREE</span>
              </p>
              <p>
                <span className="text-muted">Status:</span>{" "}
                <span className="text-emerald-600 font-semibold capitalize">{booked.status}</span>
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => {
                  setBooked(null);
                  setSelected(null);
                  setTab("bookings");
                  loadBookings();
                }}
                className="flex-1 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold py-2.5 rounded-full"
              >
                View bookings
              </button>
              <button
                type="button"
                onClick={() => {
                  setBooked(null);
                  setSelected(null);
                }}
                className="flex-1 bg-panel2 border border-border text-sm font-semibold py-2.5 rounded-full"
              >
                Book another
              </button>
            </div>

          </div>
        )}

        {/* BOOKINGS TAB */}
        {tab === "bookings" && (
          <div className="mt-5 space-y-3">
            {bookings.length === 0 && (
              <p className="text-sm text-muted">
                No bookings yet. Find a doctor and book your first consult.
              </p>
            )}
            {bookings.map((b) => (
              <div key={b.id} className="card-surface p-4 card-hover">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-3 min-w-0">
                    {b.doctor_photo ? (
                      <img
                        src={b.doctor_photo}
                        alt={b.doctor_name}
                        className="w-[52px] h-[52px] rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                      />
                    ) : (
                      <DoctorAvatar
                        name={b.doctor_name}
                        specialty={b.doctor_specialty}
                        size={52}
                        showOnline={b.status === "confirmed"}
                      />
                    )}
                    <div className="min-w-0">
                    <p className="font-bold text-sm">{b.doctor_name}</p>
                    <p className="text-xs text-accent2">{b.doctor_specialty}</p>
                    {b.doctor_phone && (
                      <a
                        href={`tel:${String(b.doctor_phone).replace(/\s/g, "")}`}
                        className="text-[11px] font-bold text-accent2 inline-flex items-center gap-1 mt-0.5 hover:underline"
                      >
                        <Phone size={11} /> {b.doctor_phone}
                      </a>
                    )}
                    <p className="text-[11px] text-muted mt-1">
                      {b.preferred_date || "—"} · {b.preferred_slot || "—"} ·{" "}
                      {b.mode === "online" ? "Online" : "Clinic"}
                    </p>
                    {b.reason && <p className="text-xs text-muted mt-1">Reason: {b.reason}</p>}
                    <p className="text-[10px] text-muted mt-1">
                      Booked {formatDateTime(b.created_at)} ·{" "}
                      <span className="text-emerald-600 font-semibold">FREE</span>
                    </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${statusStyle(
                      b.status
                    )}`}
                  >
                    {b.status}
                  </span>
                </div>
                {b.status !== "cancelled" && b.status !== "completed" && (
                  <button
                    type="button"
                    onClick={() => handleCancel(b.id)}
                    className="mt-3 text-xs text-red-600 flex items-center gap-1 hover:underline"
                  >
                    <X size={12} /> Cancel booking
                  </button>
                )}
              </div>
            ))}
          </div>
        )}


        {/* FEEDBACK TAB — doctor feedback for website + photo */}
        {tab === "feedback" && (
          <div className="mt-5 space-y-3 animate-fade-slide-up">
            <DoctorFeedbackPanel />
            <p className="text-[11px] text-muted text-center px-2 leading-relaxed">
              Add name, photo (up to 10MB), mobile, and description. The doctor then appears
              under Find doctors for free booking or a direct call.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
