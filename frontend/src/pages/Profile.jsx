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

const GENDER_OPTIONS = ["", "Male", "Female", "Other"];

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
    <div className="page-enter">
      <TopBar showBack />
      <div className="px-5 md:px-8 lg:px-10 pb-6">
        <h2 className="text-xl font-bold">My Profile</h2>
        <p className="text-muted text-sm mt-1">
          Saved on this device only - used to personalize your dashboard and PDF receipts.
        </p>

        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start mt-5">
          {/* Basic info */}
          <div className="card-surface p-5 shadow-card">
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
                    className="input-field mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Health summary */}
          <div className="card-surface p-5 mt-4 lg:mt-0 shadow-soft">
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
                      className="w-full bg-transparent outline-none text-sm placeholder:text-muted"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-panel2 flex items-center justify-center shrink-0">
                  <Users size={15} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <label className="text-[11px] text-muted">Gender</label>
                  <select
                    value={profile.gender || ""}
                    onChange={(e) => update("gender", e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                  >
                    <option value="">Select…</option>
                    {GENDER_OPTIONS.filter(Boolean).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted mt-1">
                    Used by Gender Health ML for male/female-specific advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full btn-primary py-3 mt-5"
        >
          <Save size={16} />
          {savedFlash ? "Saved!" : "Save Profile"}
        </button>
      </div>
    </div>
  );
}
