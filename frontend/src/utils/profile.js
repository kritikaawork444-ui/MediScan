const KEY = "mediscan.profile";

export const defaultProfile = {
  name: "",
  email: "",
  phone: "",
  bloodGroup: "",
  height: "",
  weight: "",
  dob: "",
  gender: "",
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile) {
  localStorage.setItem(KEY, JSON.stringify(profile));
}
