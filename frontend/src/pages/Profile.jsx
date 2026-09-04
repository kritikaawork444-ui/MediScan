import { useState } from "react";
import { User, Save, Droplet, Ruler, Scale, Calendar, Users } from "lucide-react";
import TopBar from "../components/TopBar.jsx";
import { getProfile, saveProfile } from "../utils/profile.js";

const FIELD_ROWS = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Your name" },
  { key: "email", label: "Email", type: "email", placeholder: "you@example.com" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
];

const HEALTH_ROWS = [
  { key: "bloodGroup", label: "Blood Group", icon: Droplet, placeholder: "e.g. O+" },
  { key: "height", label: "Height (cm)", icon: Ruler, placeholder: "e.g. 175" },
  { key: "weight", label: "Weight (kg)", icon: Scale, placeholder: "e.g. 68" },
  { key: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
];

export default function Profile() {
  const [profile, setProfile] = useState(getProfile());
  const [savedFlash, setSavedFlash] = useState(false);

  const update = (key, value) => setProfile((p) => ({ ...p, [key]: value }));

  const handleSave = () => {
    saveProfile(profile);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div>
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10 pb-6">
        <h2 className="text-xl font-bold">My Profile</h2>
        <p className="text-muted text-sm mt-1">
          Saved on this device only — gender is used to personalize treatment tips on
          Symptom Checker and ML Predictor.
        </p>

        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start mt-5">
          <div className="bg-panel border border-border rounded-xl2 p-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {profile.name ? initials : <User size={24} />}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">{profile.name || "Add your name"}</p>
                <p className="text-xs text-muted truncate">{profile.email || "No email set"}</p>
              </div>
            </div>

            <div className="space-y-4 mt-5">
              {FIELD_ROWS.map(({ key, label, type, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-muted">{label}</label>
                  <input
                    type={type}
                    value={profile[key]}
                    onChange={(e) => update(key, e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-panel2 border border-border rounded-xl px-3 py-2.5 text-sm mt-1 outline-none focus:border-accent transition-colors placeholder:text-muted"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-panel border border-border rounded-xl2 p-5 mt-4 lg:mt-0">
            <p className="font-bold mb-4">Health Summary</p>
            <div className="space-y-4">
              {HEALTH_ROWS.map(({ key, label, icon: Icon, type = "text", placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-panel2 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="text-[11px] text-muted">{label}</label>
                    <input
                      type={type}
                      value={profile[key]}
                      onChange={(e) => update(key, e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent border-b border-border px-0 py-1 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted"
                    />
                  </div>
                </div>
              ))}

              {/* Gender — used for treatment */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-panel2 flex items-center justify-center shrink-0 mt-1">
                  <Users size={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] text-muted">Gender</label>
                  <select
                    value={profile.gender || ""}
                    onChange={(e) => update("gender", e.target.value)}
                    className="w-full bg-panel2 border border-border rounded-xl px-3 py-2 text-sm mt-1 outline-none focus:border-accent"
                  >
                    <option value="">Select…</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-[10px] text-muted mt-1.5 leading-relaxed">
                    Symptom Checker and ML Predictor use this for male / female specific
                    treatment notes from the health knowledge base.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full md:w-auto md:px-10 mt-6 bg-gradient-to-r from-accent to-accent2 text-white text-sm font-semibold py-3 rounded-full hover:opacity-90 active:scale-95 transition inline-flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {savedFlash ? "Saved!" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
