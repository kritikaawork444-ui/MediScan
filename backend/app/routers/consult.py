"""
Doctor Consult APIs — list doctors, book a consult, manage bookings.
"""
from __future__ import annotations

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_serializer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Doctor, Consultation, WebsiteFeedback, DoctorFeedback, utc_now
from datetime import datetime, timezone

router = APIRouter(prefix="/api/consult", tags=["Doctor Consult"])

DEFAULT_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM",
    "05:00 PM", "06:00 PM", "07:00 PM", "08:00 PM",
]

SEED_DOCTORS = [
    {
        "name": "Dr. Ananya Sharma",
        "specialty": "General Physician",
        "qualification": "MBBS, MD (Medicine)",
        "experience_years": 12,
        "hospital": "Apollo Spectra, Mumbai",
        "city": "Mumbai",
        "languages": "English, Hindi, Marathi",
        "consultation_fee": 0,
        "rating": 4.8,
        "about": "Experienced GP for fever, infections, lifestyle diseases and routine health checks.",
        "mode": "both",
        "available_days": "Mon–Sat",
    },
    {
        "name": "Dr. Rohan Mehta",
        "specialty": "General Physician",
        "qualification": "MBBS, DNB (Family Medicine)",
        "experience_years": 8,
        "hospital": "Fortis Hospital, Mulund",
        "city": "Mumbai",
        "languages": "English, Hindi",
        "consultation_fee": 0,
        "rating": 4.6,
        "about": "Family physician focusing on cold, cough, stomach issues and preventive care.",
        "mode": "online",
        "available_days": "Mon–Sun",
    },
    {
        "name": "Dr. Priya Nair",
        "specialty": "Dermatologist",
        "qualification": "MBBS, MD (Dermatology)",
        "experience_years": 10,
        "hospital": "Skin & You Clinic",
        "city": "Mumbai",
        "languages": "English, Hindi, Malayalam",
        "consultation_fee": 0,
        "rating": 4.9,
        "about": "Skin, hair and acne specialist. Online consults for rashes and allergies.",
        "mode": "both",
        "available_days": "Tue–Sat",
    },
    {
        "name": "Dr. Vikram Singh",
        "specialty": "Orthopedic",
        "qualification": "MBBS, MS (Ortho)",
        "experience_years": 15,
        "hospital": "Lilavati Hospital",
        "city": "Mumbai",
        "languages": "English, Hindi",
        "consultation_fee": 0,
        "rating": 4.7,
        "about": "Bone, joint, sprain and sports injury specialist.",
        "mode": "both",
        "available_days": "Mon–Fri",
    },
    {
        "name": "Dr. Sneha Patel",
        "specialty": "Gynecologist",
        "qualification": "MBBS, MS (OBGYN)",
        "experience_years": 11,
        "hospital": "Cloudnine Hospital",
        "city": "Mumbai",
        "languages": "English, Hindi, Gujarati",
        "consultation_fee": 0,
        "rating": 4.8,
        "about": "Women's health, PCOS, menstrual issues and pregnancy care.",
        "mode": "both",
        "available_days": "Mon–Sat",
    },
    {
        "name": "Dr. Arjun Desai",
        "specialty": "Pediatrician",
        "qualification": "MBBS, MD (Pediatrics)",
        "experience_years": 9,
        "hospital": "SRCC Children's Hospital",
        "city": "Mumbai",
        "languages": "English, Hindi, Marathi",
        "consultation_fee": 0,
        "rating": 4.7,
        "about": "Child fever, vaccination guidance and growth concerns.",
        "mode": "both",
        "available_days": "Mon–Sat",
    },
    {
        "name": "Dr. Meera Iyer",
        "specialty": "ENT",
        "qualification": "MBBS, MS (ENT)",
        "experience_years": 13,
        "hospital": "Hinduja Hospital",
        "city": "Mumbai",
        "languages": "English, Hindi, Tamil",
        "consultation_fee": 0,
        "rating": 4.6,
        "about": "Ear, nose, throat infections, sinus and hearing issues.",
        "mode": "both",
        "available_days": "Mon–Fri",
    },
    {
        "name": "Dr. Kabir Khan",
        "specialty": "Cardiologist",
        "qualification": "MBBS, DM (Cardiology)",
        "experience_years": 18,
        "hospital": "Asian Heart Institute",
        "city": "Mumbai",
        "languages": "English, Hindi, Urdu",
        "consultation_fee": 0,
        "rating": 4.9,
        "about": "Chest pain, BP, cholesterol and heart-risk evaluation.",
        "mode": "clinic",
        "available_days": "Mon–Fri",
    },
    {
        "name": "Dr. Neha Gupta",
        "specialty": "Psychiatrist",
        "qualification": "MBBS, MD (Psychiatry)",
        "experience_years": 7,
        "hospital": "Mind Care Clinic",
        "city": "Mumbai",
        "languages": "English, Hindi",
        "consultation_fee": 0,
        "rating": 4.8,
        "about": "Anxiety, sleep issues, stress and mood-related concerns. Confidential online sessions.",
        "mode": "online",
        "available_days": "Mon–Sun",
    },
    {
        "name": "Dr. Amit Joshi",
        "specialty": "Gastroenterologist",
        "qualification": "MBBS, DM (Gastro)",
        "experience_years": 14,
        "hospital": "Global Hospitals",
        "city": "Mumbai",
        "languages": "English, Hindi, Marathi",
        "consultation_fee": 0,
        "rating": 4.5,
        "about": "Acidity, IBS, liver concerns and digestive disorders.",
        "mode": "both",
        "available_days": "Tue–Sat",
    },
    {
        "name": "Dr. Fatima Sheikh",
        "specialty": "Diabetologist",
        "qualification": "MBBS, MD, Diploma in Diabetes",
        "experience_years": 10,
        "hospital": "Diabetes Care Centre",
        "city": "Mumbai",
        "languages": "English, Hindi",
        "consultation_fee": 0,
        "rating": 4.7,
        "about": "Diabetes, thyroid and metabolic syndrome management.",
        "mode": "both",
        "available_days": "Mon–Sat",
    },
    {
        "name": "Dr. Rahul Verma",
        "specialty": "Pulmonologist",
        "qualification": "MBBS, MD (Pulmonary Medicine)",
        "experience_years": 12,
        "hospital": "KEM Hospital",
        "city": "Mumbai",
        "languages": "English, Hindi",
        "consultation_fee": 0,
        "rating": 4.6,
        "about": "Asthma, cough, breathlessness and lung infections.",
        "mode": "both",
        "available_days": "Mon–Fri",
    },
]


# ---------- schemas ----------

class DoctorOut(BaseModel):
    id: int
    name: str
    specialty: str
    qualification: Optional[str] = None
    experience_years: int = 0
    hospital: Optional[str] = None
    city: Optional[str] = None
    languages: Optional[str] = None
    consultation_fee: int = 0
    rating: float = 4.5
    about: Optional[str] = None
    mode: str = "both"
    available_days: Optional[str] = None
    slots: List[str] = []
    phone: Optional[str] = None
    photo_data: Optional[str] = None
    photo_name: Optional[str] = None
    source: Optional[str] = "seed"
    is_real: bool = True

    class Config:
        from_attributes = True


class BookConsultRequest(BaseModel):
    doctor_id: int
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None
    mode: str = "online"  # online | clinic
    preferred_date: Optional[str] = None
    preferred_slot: Optional[str] = None
    reason: Optional[str] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None


class ConsultationOut(BaseModel):
    id: int
    doctor_id: int
    doctor_name: str = ""
    doctor_specialty: str = ""
    doctor_phone: Optional[str] = None
    doctor_photo: Optional[str] = None
    patient_name: str
    patient_phone: Optional[str] = None
    patient_email: Optional[str] = None
    patient_age: Optional[str] = None
    patient_gender: Optional[str] = None
    mode: str
    preferred_date: Optional[str] = None
    preferred_slot: Optional[str] = None
    reason: Optional[str] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None
    status: str
    fee: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value is None:
            return value
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


def _doctor_to_out(d: Doctor) -> dict:
    try:
        slots = json.loads(d.slot_json or "[]")
    except Exception:
        slots = list(DEFAULT_SLOTS)
    if not slots:
        slots = list(DEFAULT_SLOTS)
    phone = getattr(d, "phone", None) or None
    photo = getattr(d, "photo_data", None) or None
    source = getattr(d, "source", None) or "seed"
    return {
        "id": d.id,
        "name": d.name,
        "specialty": d.specialty,
        "qualification": d.qualification,
        "experience_years": d.experience_years or 0,
        "hospital": d.hospital,
        "city": d.city,
        "languages": d.languages,
        "consultation_fee": d.consultation_fee or 0,
        "rating": d.rating or 4.5,
        "about": d.about,
        "mode": d.mode or "both",
        "available_days": d.available_days,
        "slots": slots,
        "phone": phone,
        "photo_data": photo,
        "photo_name": getattr(d, "photo_name", None),
        "source": source,
        "is_real": bool(phone),
    }


def seed_doctors_if_empty(db: Session) -> None:
    count = db.query(Doctor).count()
    if count > 0:
        return
    for row in SEED_DOCTORS:
        db.add(
            Doctor(
                **row,
                slot_json=json.dumps(DEFAULT_SLOTS),
                is_active=1,
            )
        )
    db.commit()


@router.on_event("startup")
def _startup_seed():
    # FastAPI router startup is unreliable for include_router; seed lazily instead.
    pass


def _ensure_seed(db: Session):
    seed_doctors_if_empty(db)


@router.get("/specialties")
def list_specialties(db: Session = Depends(get_db)):
    _ensure_seed(db)
    rows = db.query(Doctor.specialty).filter(Doctor.is_active == 1).distinct().all()
    specs = sorted({r[0] for r in rows if r[0]})
    return {"specialties": specs}


@router.get("/doctors", response_model=List[DoctorOut])
def list_doctors(
    q: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    mode: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    _ensure_seed(db)
    query = db.query(Doctor).filter(Doctor.is_active == 1)
    if specialty and specialty.lower() not in ("all", ""):
        query = query.filter(Doctor.specialty.ilike(specialty))
    if city:
        query = query.filter(Doctor.city.ilike(f"%{city}%"))
    if mode and mode.lower() in ("online", "clinic"):
        # match exact mode or "both"
        query = query.filter(
            (Doctor.mode == mode.lower()) | (Doctor.mode == "both")
        )
    doctors = query.order_by(Doctor.rating.desc(), Doctor.name.asc()).all()
    # Prefer contacts that have a real mobile number first
    doctors = sorted(
        doctors,
        key=lambda d: (0 if (getattr(d, "phone", None) or "").strip() else 1, -(d.rating or 0), d.name or ""),
    )
    out = [_doctor_to_out(d) for d in doctors]
    if q:
        ql = q.lower()
        out = [
            d
            for d in out
            if ql in d["name"].lower()
            or ql in (d["specialty"] or "").lower()
            or ql in (d["hospital"] or "").lower()
            or ql in (d["about"] or "").lower()
        ]
    return out


@router.get("/doctors/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)):
    _ensure_seed(db)
    d = db.query(Doctor).filter(Doctor.id == doctor_id, Doctor.is_active == 1).first()
    if not d:
        raise HTTPException(404, "Doctor not found")
    return _doctor_to_out(d)



class AddDoctorRequest(BaseModel):
    name: str
    specialty: str = "General Physician"
    qualification: Optional[str] = "MBBS"
    experience_years: Optional[int] = 5
    hospital: Optional[str] = "Private practice"
    city: Optional[str] = "Mumbai"
    languages: Optional[str] = "English, Hindi"
    phone: str
    about: Optional[str] = None
    mode: str = "both"  # online | clinic | both
    available_days: Optional[str] = "Mon–Sat"
    photo_data: Optional[str] = None
    photo_name: Optional[str] = None
    consultation_fee: int = 0
    rating: Optional[float] = 4.8


@router.post("/doctors", response_model=DoctorOut)
def add_doctor(payload: AddDoctorRequest, db: Session = Depends(get_db)):
    """Add a real doctor to the directory (bookable + callable). Fee forced to ₹0."""
    _ensure_seed(db)
    name = (payload.name or "").strip()
    phone = (payload.phone or "").strip()
    specialty = (payload.specialty or "General Physician").strip() or "General Physician"
    if not name:
        raise HTTPException(400, "Doctor name is required")
    if not phone:
        raise HTTPException(400, "Mobile number is required")
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 8:
        raise HTTPException(400, "Enter a valid mobile number (at least 8 digits)")

    mode = (payload.mode or "both").lower().strip()
    if mode not in ("online", "clinic", "both"):
        mode = "both"

    photo_data = payload.photo_data
    if photo_data:
        if len(photo_data) > 14_000_000:
            raise HTTPException(400, "Photo too large (max 10MB)")
        if not str(photo_data).startswith("data:image/"):
            raise HTTPException(400, "photo_data must be an image data URL")

    about = (payload.about or "").strip() or f"Real doctor contact. Call {phone} to confirm."
    photo_name = (payload.photo_name or "").strip() or None

    # Upsert by phone (preferred) or name
    existing = db.query(Doctor).filter(Doctor.phone == phone).first()
    if existing is None:
        existing = db.query(Doctor).filter(Doctor.name.ilike(name)).first()

    if existing is None:
        doc = Doctor(
            name=name,
            specialty=specialty,
            qualification=(payload.qualification or "MBBS").strip() or "MBBS",
            experience_years=int(payload.experience_years or 5),
            hospital=(payload.hospital or "Private practice").strip() or "Private practice",
            city=(payload.city or "Mumbai").strip() or "Mumbai",
            languages=(payload.languages or "English, Hindi").strip() or "English, Hindi",
            consultation_fee=0,
            rating=float(payload.rating or 4.8),
            about=about,
            mode=mode,
            available_days=(payload.available_days or "Mon–Sat").strip() or "Mon–Sat",
            slot_json=json.dumps(DEFAULT_SLOTS),
            phone=phone,
            photo_data=photo_data,
            photo_name=photo_name,
            source="manual",
            is_active=1,
        )
        db.add(doc)
    else:
        doc = existing
        doc.name = name
        doc.specialty = specialty
        doc.qualification = (payload.qualification or doc.qualification or "MBBS").strip()
        doc.experience_years = int(payload.experience_years if payload.experience_years is not None else (doc.experience_years or 5))
        doc.hospital = (payload.hospital or doc.hospital or "Private practice").strip()
        doc.city = (payload.city or doc.city or "Mumbai").strip()
        doc.languages = (payload.languages or doc.languages or "English, Hindi").strip()
        doc.consultation_fee = 0
        doc.about = about
        doc.mode = mode
        doc.available_days = (payload.available_days or doc.available_days or "Mon–Sat").strip()
        doc.phone = phone
        if photo_data:
            doc.photo_data = photo_data
            doc.photo_name = photo_name
        if not doc.slot_json:
            doc.slot_json = json.dumps(DEFAULT_SLOTS)
        doc.source = "manual"
        doc.is_active = 1
        db.add(doc)

    db.commit()
    db.refresh(doc)
    return _doctor_to_out(doc)


@router.post("/book", response_model=ConsultationOut)
def book_consult(payload: BookConsultRequest, db: Session = Depends(get_db)):
    _ensure_seed(db)
    if not (payload.patient_name or "").strip():
        raise HTTPException(400, "Patient name is required")
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id, Doctor.is_active == 1).first()
    if not doctor:
        raise HTTPException(404, "Doctor not found")

    mode = (payload.mode or "online").lower()
    if mode not in ("online", "clinic"):
        mode = "online"
    if doctor.mode == "online" and mode == "clinic":
        raise HTTPException(400, "This doctor only offers online consults")
    if doctor.mode == "clinic" and mode == "online":
        raise HTTPException(400, "This doctor only offers clinic visits")

    rec = Consultation(
        doctor_id=doctor.id,
        patient_name=payload.patient_name.strip(),
        patient_phone=(payload.patient_phone or "").strip() or None,
        patient_email=(payload.patient_email or "").strip() or None,
        patient_age=(payload.patient_age or "").strip() or None,
        patient_gender=(payload.patient_gender or "").strip() or None,
        mode=mode,
        preferred_date=payload.preferred_date,
        preferred_slot=payload.preferred_slot,
        reason=(payload.reason or "").strip() or None,
        symptoms=(payload.symptoms or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        status="confirmed",  # demo: auto-confirm
        fee=0,  # free consult
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    return {
        "id": rec.id,
        "doctor_id": doctor.id,
        "doctor_name": doctor.name,
        "doctor_specialty": doctor.specialty,
        "doctor_phone": getattr(doctor, "phone", None),
        "doctor_photo": getattr(doctor, "photo_data", None),
        "patient_name": rec.patient_name,
        "patient_phone": rec.patient_phone,
        "patient_email": rec.patient_email,
        "patient_age": rec.patient_age,
        "patient_gender": rec.patient_gender,
        "mode": rec.mode,
        "preferred_date": rec.preferred_date,
        "preferred_slot": rec.preferred_slot,
        "reason": rec.reason,
        "symptoms": rec.symptoms,
        "notes": rec.notes,
        "status": rec.status,
        "fee": rec.fee,
        "created_at": rec.created_at or utc_now(),
    }


@router.get("/bookings", response_model=List[ConsultationOut])
def list_bookings(db: Session = Depends(get_db)):
    _ensure_seed(db)
    rows = (
        db.query(Consultation)
        .options(joinedload(Consultation.doctor))
        .order_by(Consultation.created_at.desc())
        .all()
    )
    out = []
    for r in rows:
        doc = r.doctor
        out.append(
            {
                "id": r.id,
                "doctor_id": r.doctor_id,
                "doctor_name": doc.name if doc else "",
                "doctor_specialty": doc.specialty if doc else "",
                "doctor_phone": getattr(doc, "phone", None) if doc else None,
                "doctor_photo": getattr(doc, "photo_data", None) if doc else None,
                "patient_name": r.patient_name,
                "patient_phone": r.patient_phone,
                "patient_email": r.patient_email,
                "patient_age": r.patient_age,
                "patient_gender": r.patient_gender,
                "mode": r.mode,
                "preferred_date": r.preferred_date,
                "preferred_slot": r.preferred_slot,
                "reason": r.reason,
                "symptoms": r.symptoms,
                "notes": r.notes,
                "status": r.status,
                "fee": r.fee or 0,
                "created_at": r.created_at or utc_now(),
            }
        )
    return out


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    rec = db.query(Consultation).filter(Consultation.id == booking_id).first()
    if not rec:
        raise HTTPException(404, "Booking not found")
    if rec.status == "cancelled":
        return {"id": booking_id, "status": "cancelled"}
    rec.status = "cancelled"
    db.commit()
    return {"id": booking_id, "status": "cancelled"}


# ---------- Website feedback (sahi / galat + symptoms + university) ----------

class FeedbackRequest(BaseModel):
    verdict: str  # sahi | galat — overall website
    rating: Optional[int] = None
    comment: Optional[str] = None
    page: Optional[str] = "consult"
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    user_name: Optional[str] = None
    # Symptom accuracy
    symptom_accuracy: Optional[str] = None  # sahi | galat | partial
    symptoms_tried: Optional[str] = None
    expected_condition: Optional[str] = None
    predicted_condition: Optional[str] = None
    # University details
    university_name: Optional[str] = None
    university_course: Optional[str] = None
    university_year: Optional[str] = None
    university_id: Optional[str] = None
    university_email: Optional[str] = None
    university_city: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    verdict: str
    rating: Optional[int] = None
    comment: Optional[str] = None
    page: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    user_name: Optional[str] = None
    symptom_accuracy: Optional[str] = None
    symptoms_tried: Optional[str] = None
    expected_condition: Optional[str] = None
    predicted_condition: Optional[str] = None
    university_name: Optional[str] = None
    university_course: Optional[str] = None
    university_year: Optional[str] = None
    university_id: Optional[str] = None
    university_email: Optional[str] = None
    university_city: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value is None:
            return value
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


def _feedback_to_out(f: WebsiteFeedback) -> dict:
    return {
        "id": f.id,
        "verdict": f.verdict,
        "rating": f.rating,
        "comment": f.comment,
        "page": f.page,
        "doctor_id": f.doctor_id,
        "doctor_name": f.doctor_name,
        "user_name": f.user_name,
        "symptom_accuracy": getattr(f, "symptom_accuracy", None),
        "symptoms_tried": getattr(f, "symptoms_tried", None),
        "expected_condition": getattr(f, "expected_condition", None),
        "predicted_condition": getattr(f, "predicted_condition", None),
        "university_name": getattr(f, "university_name", None),
        "university_course": getattr(f, "university_course", None),
        "university_year": getattr(f, "university_year", None),
        "university_id": getattr(f, "university_id", None),
        "university_email": getattr(f, "university_email", None),
        "university_city": getattr(f, "university_city", None),
        "created_at": f.created_at or utc_now(),
    }


def _symptom_stats(db: Session) -> dict:
    rows = db.query(WebsiteFeedback.symptom_accuracy).all()
    counts = {"sahi": 0, "galat": 0, "partial": 0, "answered": 0}
    for (val,) in rows:
        if not val:
            continue
        v = str(val).lower()
        if v in counts:
            counts[v] += 1
            counts["answered"] += 1
    answered = counts["answered"]
    return {
        **{k: counts[k] for k in ("sahi", "galat", "partial", "answered")},
        "sahi_percent": round((counts["sahi"] / answered) * 100, 1) if answered else 0,
    }


@router.post("/feedback", response_model=FeedbackOut)
def submit_feedback(payload: FeedbackRequest, db: Session = Depends(get_db)):
    verdict = (payload.verdict or "").strip().lower()
    if verdict not in ("sahi", "galat"):
        raise HTTPException(400, "Verdict must be 'sahi' or 'galat'")
    rating = payload.rating
    if rating is not None and (rating < 1 or rating > 5):
        raise HTTPException(400, "Rating must be 1–5")

    symptom_accuracy = (payload.symptom_accuracy or "").strip().lower() or None
    if symptom_accuracy and symptom_accuracy not in ("sahi", "galat", "partial"):
        raise HTTPException(400, "symptom_accuracy must be sahi, galat, or partial")

    doctor_name = (payload.doctor_name or "").strip() or None
    if payload.doctor_id and not doctor_name:
        doc = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
        if doc:
            doctor_name = doc.name

    def _s(v: Optional[str]) -> Optional[str]:
        return (v or "").strip() or None

    rec = WebsiteFeedback(
        verdict=verdict,
        rating=rating,
        comment=_s(payload.comment),
        page=_s(payload.page) or "consult",
        doctor_id=payload.doctor_id,
        doctor_name=doctor_name,
        user_name=_s(payload.user_name),
        symptom_accuracy=symptom_accuracy,
        symptoms_tried=_s(payload.symptoms_tried),
        expected_condition=_s(payload.expected_condition),
        predicted_condition=_s(payload.predicted_condition),
        university_name=_s(payload.university_name),
        university_course=_s(payload.university_course),
        university_year=_s(payload.university_year),
        university_id=_s(payload.university_id),
        university_email=_s(payload.university_email),
        university_city=_s(payload.university_city),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _feedback_to_out(rec)


@router.get("/feedback")
def list_feedback(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(WebsiteFeedback)
        .order_by(WebsiteFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    total = db.query(WebsiteFeedback).count()
    sahi = db.query(WebsiteFeedback).filter(WebsiteFeedback.verdict == "sahi").count()
    galat = db.query(WebsiteFeedback).filter(WebsiteFeedback.verdict == "galat").count()
    return {
        "summary": {
            "total": total,
            "sahi": sahi,
            "galat": galat,
            "sahi_percent": round((sahi / total) * 100, 1) if total else 0,
            "symptoms": _symptom_stats(db),
        },
        "items": [_feedback_to_out(r) for r in rows],
    }


@router.get("/feedback/summary")
def feedback_summary(db: Session = Depends(get_db)):
    total = db.query(WebsiteFeedback).count()
    sahi = db.query(WebsiteFeedback).filter(WebsiteFeedback.verdict == "sahi").count()
    galat = db.query(WebsiteFeedback).filter(WebsiteFeedback.verdict == "galat").count()
    return {
        "total": total,
        "sahi": sahi,
        "galat": galat,
        "sahi_percent": round((sahi / total) * 100, 1) if total else 0,
        "symptoms": _symptom_stats(db),
    }


# ---------- Doctor feedback (name + photo + mobile only) ----------

class DoctorFeedbackRequest(BaseModel):
    doctor_name: str
    doctor_mobile: str
    description: Optional[str] = None
    photo_data: Optional[str] = None  # data:image/...;base64,...
    photo_name: Optional[str] = None
    doctor_id: Optional[int] = None


class DoctorFeedbackOut(BaseModel):
    id: int
    doctor_id: Optional[int] = None
    doctor_name: str
    doctor_mobile: str
    description: Optional[str] = None
    photo_data: Optional[str] = None
    photo_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

    @field_serializer("created_at")
    def serialize_created_at(self, value: datetime) -> str:
        if value is None:
            return value
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        else:
            value = value.astimezone(timezone.utc)
        return value.isoformat().replace("+00:00", "Z")


def _doctor_feedback_to_out(f: DoctorFeedback) -> dict:
    return {
        "id": f.id,
        "doctor_id": f.doctor_id,
        "doctor_name": f.doctor_name or "",
        "doctor_mobile": getattr(f, "doctor_mobile", None) or "",
        "description": getattr(f, "description", None),
        "photo_data": getattr(f, "photo_data", None),
        "photo_name": getattr(f, "photo_name", None),
        "created_at": f.created_at or utc_now(),
    }


@router.post("/doctor-feedback", response_model=DoctorFeedbackOut)
def submit_doctor_feedback(payload: DoctorFeedbackRequest, db: Session = Depends(get_db)):
    name = (payload.doctor_name or "").strip()
    mobile = (payload.doctor_mobile or "").strip()
    if not name:
        raise HTTPException(400, "Doctor name required")
    if not mobile:
        raise HTTPException(400, "Doctor mobile number required")
    # light phone sanity
    digits = "".join(ch for ch in mobile if ch.isdigit())
    if len(digits) < 8:
        raise HTTPException(400, "Enter a valid mobile number")

    photo_data = payload.photo_data
    if not photo_data:
        raise HTTPException(400, "Doctor photo required")
    # ~10MB original image as base64 data URL (~13.3MB text)
    if len(photo_data) > 14_000_000:
        raise HTTPException(400, "Photo too large (max 10MB)")
    if not str(photo_data).startswith("data:image/"):
        raise HTTPException(400, "photo_data must be an image data URL")

    doctor_id = payload.doctor_id
    if doctor_id is not None:
        doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
        if not doc:
            doctor_id = None

    photo_name = (payload.photo_name or "").strip() or None
    description = (payload.description or "").strip() or None

    # Upsert into doctors list so this real contact is bookable on Find doctors
    bookable = None
    if doctor_id is not None:
        bookable = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if bookable is None:
        # match by exact mobile first, else name
        bookable = (
            db.query(Doctor)
            .filter(Doctor.phone == mobile)
            .first()
        )
    if bookable is None:
        bookable = (
            db.query(Doctor)
            .filter(Doctor.name.ilike(name))
            .first()
        )
    if bookable is None:
        bookable = Doctor(
            name=name,
            specialty="General Physician",
            qualification="MBBS",
            experience_years=5,
            hospital="Private practice",
            city="Mumbai",
            languages="English, Hindi",
            consultation_fee=0,
            rating=4.8,
            about=description or f"Real doctor contact. Call {mobile} to confirm.",
            mode="both",
            available_days="Mon–Sat",
            slot_json=json.dumps(DEFAULT_SLOTS),
            phone=mobile,
            photo_data=photo_data,
            photo_name=photo_name,
            source="feedback",
            is_active=1,
        )
        db.add(bookable)
        db.flush()
    else:
        bookable.name = name
        bookable.phone = mobile
        bookable.photo_data = photo_data
        bookable.photo_name = photo_name
        if description:
            bookable.about = description
        if not bookable.source or bookable.source == "seed":
            bookable.source = "feedback"
        bookable.is_active = 1
        if not bookable.about:
            bookable.about = f"Real doctor contact. Call {mobile} to confirm visit."
        if not bookable.slot_json:
            bookable.slot_json = json.dumps(DEFAULT_SLOTS)
        db.add(bookable)
        db.flush()

    rec = DoctorFeedback(
        doctor_id=bookable.id,
        doctor_name=name,
        doctor_mobile=mobile,
        description=description,
        photo_data=photo_data,
        photo_name=photo_name,
        verdict=None,
        rating=None,
        comment=None,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return _doctor_feedback_to_out(rec)


@router.get("/doctor-feedback")
def list_doctor_feedback(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(DoctorFeedback)
        .order_by(DoctorFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "total": db.query(DoctorFeedback).count(),
        "items": [_doctor_feedback_to_out(r) for r in rows],
    }


@router.get("/doctors/{doctor_id}/feedback")
def doctor_feedback_for_doctor(
    doctor_id: int, limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db)
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    rows = (
        db.query(DoctorFeedback)
        .filter(DoctorFeedback.doctor_id == doctor_id)
        .order_by(DoctorFeedback.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "doctor_id": doctor_id,
        "doctor_name": doctor.name,
        "total": len(rows),
        "items": [_doctor_feedback_to_out(r) for r in rows],
    }


@router.get("/doctor-feedback/summary")
def all_doctors_feedback_summary(db: Session = Depends(get_db)):
    total = db.query(DoctorFeedback).count()
    return {"total": total}

