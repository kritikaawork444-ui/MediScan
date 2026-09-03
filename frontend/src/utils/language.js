// Small shared helper so every AI feature (Symptom Checker, Report Scanner,
// Injury Analyzer, Encyclopedia) can remember the user's chosen response
// language across the app, without needing a full i18n library.

const STORAGE_KEY = "mediscan_language";

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
  { code: "hinglish", label: "Hinglish" },
];

export function getLanguage() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "en";
  } catch {
    return "en";
  }
}

export function setLanguage(code) {
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // ignore (e.g. private browsing storage errors)
  }
}
