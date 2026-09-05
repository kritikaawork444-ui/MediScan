import axios from "axios";
import { getLanguage } from "../utils/language.js";

// Local dev: leave VITE_API_URL empty → Vite proxies /api → :8000
// Production: set VITE_API_URL to your API origin, e.g. https://xxx.onrender.com
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const api = axios.create({ baseURL: API_BASE || "/" });

/** Offline symptom check (knowledge base + profile gender). Path kept for API compat. */
export const checkSymptoms = (
  symptoms,
  { painLocation, painDescription, notes, language, gender } = {}
) =>
  api
    .post("/api/symptoms/check", {
      symptoms,
      pain_location: painLocation,
      pain_description: painDescription,
      notes,
      language: language || getLanguage(),
      gender: gender || undefined,
    })
    .then((r) => r.data);

/** @deprecated use checkSymptoms */
export const checkSymptomsOllama = checkSymptoms;

export const predictML = ({ fever, headache, cough, fatigue, bodyPain, language, gender }) =>
  api
    .post("/api/symptoms/predict-ml", {
      fever,
      headache,
      cough,
      fatigue,
      body_pain: bodyPain,
      language: language || getLanguage(),
      gender: gender || undefined,
    })
    .then((r) => r.data);

export const scanReport = (file, language) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language || getLanguage());
  return api
    .post("/api/reports/scan", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const analyzeInjury = (file, language) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language || getLanguage());
  return api
    .post("/api/injury/analyze", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);
};

export const getHistory = () => api.get("/api/history/").then((r) => r.data);
export const clearHistory = () => api.delete("/api/history/").then((r) => r.data);
export const deleteHistoryEntry = (id) => api.delete(`/api/history/${id}`).then((r) => r.data);

export const getEncyclopedia = (q, category) =>
  api.get("/api/encyclopedia/", { params: { q, category } }).then((r) => r.data);

export const lookupDisease = (query, language) =>
  api
    .post("/api/encyclopedia/lookup", { query, language: language || getLanguage() })
    .then((r) => r.data);

// Gender-aware ML (spreadsheet dataset with male/female notes)
export const getGenderStatus = () => api.get("/api/gender-ml/status").then((r) => r.data);
export const getGenderSymptoms = () => api.get("/api/gender-ml/symptoms").then((r) => r.data);
export const getGenderInjuries = () => api.get("/api/gender-ml/injuries").then((r) => r.data);
export const predictGenderSymptoms = ({ symptoms, gender, intensity }) =>
  api
    .post("/api/gender-ml/predict-symptoms", { symptoms, gender, intensity })
    .then((r) => r.data);
export const predictGenderInjury = ({ injuryHint, bodyPart, gender, intensity }) =>
  api
    .post("/api/gender-ml/predict-injury", {
      injury_hint: injuryHint,
      body_part: bodyPart,
      gender,
      intensity,
    })
    .then((r) => r.data);

// Doctor Consult
export const getConsultSpecialties = () =>
  api.get("/api/consult/specialties").then((r) => r.data);
export const getDoctors = (params = {}) =>
  api.get("/api/consult/doctors", { params }).then((r) => r.data);
export const getDoctor = (id) =>
  api.get(`/api/consult/doctors/${id}`).then((r) => r.data);
export const addDoctor = (payload) =>
  api.post("/api/consult/doctors", payload).then((r) => r.data);
export const bookConsult = (payload) =>
  api.post("/api/consult/book", payload).then((r) => r.data);
export const getConsultBookings = () =>
  api.get("/api/consult/bookings").then((r) => r.data);
export const cancelConsultBooking = (id) =>
  api.post(`/api/consult/bookings/${id}/cancel`).then((r) => r.data);

// Website feedback (sahi / galat) — from Doctor Consult
export const submitWebsiteFeedback = (payload) =>
  api.post("/api/consult/feedback", payload).then((r) => r.data);
export const getWebsiteFeedback = (limit = 20) =>
  api.get("/api/consult/feedback", { params: { limit } }).then((r) => r.data);
export const getWebsiteFeedbackSummary = () =>
  api.get("/api/consult/feedback/summary").then((r) => r.data);

// Doctor-specific feedback (rate a doctor sahi/galat)
export const submitDoctorFeedback = (payload) =>
  api.post("/api/consult/doctor-feedback", payload).then((r) => r.data);
export const getDoctorFeedback = (params = {}) =>
  api.get("/api/consult/doctor-feedback", { params }).then((r) => r.data);
export const getDoctorFeedbackById = (doctorId, limit = 20) =>
  api
    .get(`/api/consult/doctors/${doctorId}/feedback`, { params: { limit } })
    .then((r) => r.data);
export const getDoctorFeedbackSummary = () =>
  api.get("/api/consult/doctor-feedback/summary").then((r) => r.data);

export default api;
