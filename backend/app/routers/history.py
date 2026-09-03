from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Analysis
from app.schemas import AnalysisOut

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("/", response_model=List[AnalysisOut])
def get_history(db: Session = Depends(get_db)):
    return db.query(Analysis).order_by(Analysis.created_at.desc()).all()


@router.delete("/{analysis_id}")
def delete_entry(analysis_id: int, db: Session = Depends(get_db)):
    record = db.query(Analysis).filter(Analysis.id == analysis_id).first()
    if record:
        db.delete(record)
        db.commit()
    return {"deleted": analysis_id}


@router.delete("/")
def clear_history(db: Session = Depends(get_db)):
    db.query(Analysis).delete()
    db.commit()
    return {"cleared": True}
