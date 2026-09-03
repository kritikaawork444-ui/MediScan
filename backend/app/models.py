"""
Database tables. Every analysis the user runs (symptom check, report scan,
injury scan) is written into the `analyses` table, which is what powers the
History screen.
"""
from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now() -> datetime:
    """Timezone-aware UTC timestamp for new rows."""
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    analyses = relationship("Analysis", back_populates="user")


class Analysis(Base):
    """One row per symptom-check / report-scan / injury-scan the user runs."""
    __tablename__ = "analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # "symptom" | "report" | "injury"
    analysis_type = Column(String, nullable=False)

    title = Column(String, nullable=False)          # e.g. "Blood Test Report.pdf"
    input_summary = Column(Text, nullable=True)      # e.g. "Fever, Dry Cough, Fatigue"
    result_label = Column(String, nullable=False)    # e.g. "Flu (Influenza)"
    confidence = Column(Float, nullable=True)        # 0-100
    severity = Column(String, nullable=True)         # Low / Moderate / High
    details_json = Column(Text, nullable=True)       # full structured AI response
    # Stored as UTC. Older rows may be naive UTC; API serializes them with Z.
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="analyses")


class DiseaseCache(Base):
    """Caches AI-generated encyclopedia lookups (Ollama) so the same
    search is instant next time - replaces the old Supabase Postgres cache."""
    __tablename__ = "disease_cache"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=True)
    risk_level = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    causes = Column(Text, nullable=True)
    treatment_json = Column(Text, nullable=True)  # JSON-encoded list of strings
    disclaimer = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)


class Doctor(Base):
    """Doctors available for online / clinic consult booking (real contacts)."""
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    specialty = Column(String, nullable=False, index=True)
    qualification = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    hospital = Column(String, nullable=True)
    city = Column(String, nullable=True)
    languages = Column(String, nullable=True)  # comma-separated
    consultation_fee = Column(Integer, default=0)  # INR
    rating = Column(Float, default=4.5)
    about = Column(Text, nullable=True)
    mode = Column(String, default="both")  # online | clinic | both
    available_days = Column(String, nullable=True)  # e.g. Mon-Sat
    slot_json = Column(Text, nullable=True)  # JSON list of time slots
    phone = Column(String, nullable=True)  # mobile for real booking / call
    photo_data = Column(Text, nullable=True)  # data URL image
    photo_name = Column(String, nullable=True)
    # "seed" | "feedback" | "manual"
    source = Column(String, nullable=True, default="seed")
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, default=utc_now)

    consultations = relationship("Consultation", back_populates="doctor")


class Consultation(Base):
    """A booked doctor consult request."""
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    patient_name = Column(String, nullable=False)
    patient_phone = Column(String, nullable=True)
    patient_email = Column(String, nullable=True)
    patient_age = Column(String, nullable=True)
    patient_gender = Column(String, nullable=True)

    mode = Column(String, default="online")  # online | clinic
    preferred_date = Column(String, nullable=True)  # YYYY-MM-DD
    preferred_slot = Column(String, nullable=True)  # e.g. 10:00 AM
    reason = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)

    # pending | confirmed | completed | cancelled
    status = Column(String, default="pending", index=True)
    fee = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)

    doctor = relationship("Doctor", back_populates="consultations")


class WebsiteFeedback(Base):
    """User feedback: website sahi/galat, symptom accuracy, university details."""
    __tablename__ = "website_feedback"

    id = Column(Integer, primary_key=True, index=True)
    # "sahi" | "galat" — overall website
    verdict = Column(String, nullable=False, index=True)
    rating = Column(Integer, nullable=True)  # optional 1-5
    comment = Column(Text, nullable=True)
    page = Column(String, nullable=True, default="consult")
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    doctor_name = Column(String, nullable=True)
    user_name = Column(String, nullable=True)

    # Symptom checker accuracy — did the site tell symptoms correctly?
    # "sahi" | "galat" | "partial" | null
    symptom_accuracy = Column(String, nullable=True, index=True)
    symptoms_tried = Column(Text, nullable=True)  # what user checked
    expected_condition = Column(String, nullable=True)  # what they think was correct
    predicted_condition = Column(String, nullable=True)  # what app said

    # University / college details
    university_name = Column(String, nullable=True)
    university_course = Column(String, nullable=True)
    university_year = Column(String, nullable=True)
    university_id = Column(String, nullable=True)  # roll / student id
    university_email = Column(String, nullable=True)
    university_city = Column(String, nullable=True)

    created_at = Column(DateTime, default=utc_now)


class DoctorFeedback(Base):
    """Doctor contact for the website: name, photo, mobile, description."""
    __tablename__ = "doctor_feedback"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True, index=True)
    doctor_name = Column(String, nullable=False)
    doctor_mobile = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # kept optional for older rows / soft compatibility
    verdict = Column(String, nullable=True, index=True)
    rating = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    user_name = Column(String, nullable=True)
    booking_id = Column(Integer, nullable=True)
    consult_mode = Column(String, nullable=True)
    university_name = Column(String, nullable=True)
    university_course = Column(String, nullable=True)
    university_year = Column(String, nullable=True)

    photo_data = Column(Text, nullable=True)
    photo_name = Column(String, nullable=True)

    created_at = Column(DateTime, default=utc_now)

