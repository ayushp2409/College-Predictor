from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.engine.predictor import PredictorEngine, CandidateProfile

router = APIRouter(prefix="/predict", tags=["Prediction Engine"])

class PredictionRequest(BaseModel):
    percentile: float = Field(..., ge=0.0, le=100.0, description="MHT CET Percentile (0 to 100)")
    merit_rank: Optional[int] = Field(None, ge=1, description="MHT CET State Merit Rank")
    category: str = Field("GOPENS", description="MHT CET Admission Category / Seat Quota")
    gender: Optional[str] = Field("All", description="Gender ('Male', 'Female', 'All')")
    home_university: Optional[str] = Field(None, description="Home University jurisdiction")
    domicile: Optional[str] = Field("Maharashtra", description="Maharashtra Domicile status")
    preferred_branches: Optional[List[str]] = Field(default_factory=list, description="Preferred branches")
    preferred_cities: Optional[List[str]] = Field(default_factory=list, description="Target cities in Maharashtra")
    preferred_colleges: Optional[List[int]] = Field(default_factory=list, description="Target college IDs")
    max_fees: Optional[float] = Field(None, description="Maximum total annual tuition/college fees")
    institution_type: Optional[str] = Field("All", description="College type filter")
    cap_round: str = Field("III", description="CAP Round cutoff evaluation ('I', 'II', 'III', 'All')")
    target_year: int = Field(2024, description="Historical reference CAP year")

@router.post("", response_model=Dict[str, Any])
def generate_prediction(request: PredictionRequest, db: Session = Depends(get_db)):
    """
    Generate explainable, data-backed college and branch predictions for MHT CET candidate.
    Categorizes outcomes into Likely, Borderline, and Reach with historical trends and reasoning.
    """
    profile = CandidateProfile(
        percentile=request.percentile,
        merit_rank=request.merit_rank,
        category=request.category,
        gender=request.gender,
        home_university=request.home_university,
        domicile=request.domicile,
        preferred_branches=request.preferred_branches,
        preferred_cities=request.preferred_cities,
        preferred_colleges=request.preferred_colleges,
        max_fees=request.max_fees,
        institution_type=request.institution_type,
        cap_round=request.cap_round,
        target_year=request.target_year
    )

    engine = PredictorEngine(db)
    result = engine.predict(profile)
    return result

@router.get("/categories")
def get_categories():
    """Return verified MHT CET seat categories and quotas with full display labels."""
    return [
        {"code": "GOPENS", "label": "General Open (State Level)", "group": "Open"},
        {"code": "GOPENH", "label": "General Open (Home University)", "group": "Open"},
        {"code": "GOPENO", "label": "General Open (Other than Home University)", "group": "Open"},
        {"code": "LOPENS", "label": "Ladies Open (State Level)", "group": "Ladies"},
        {"code": "LOPENH", "label": "Ladies Open (Home University)", "group": "Ladies"},
        {"code": "TFWS", "label": "Tuition Fee Waiver Scheme (TFWS 5% Supernumerary)", "group": "Fee Waiver"},
        {"code": "EWS", "label": "Economically Weaker Section (EWS 10% Quota)", "group": "EWS"},
        {"code": "GOBCS", "label": "General OBC (State Level)", "group": "OBC"},
        {"code": "LOBCS", "label": "Ladies OBC (State Level)", "group": "OBC"},
        {"code": "GSCS", "label": "General SC (State Level)", "group": "SC"},
        {"code": "LSCS", "label": "Ladies SC (State Level)", "group": "SC"},
        {"code": "GSTS", "label": "General ST (State Level)", "group": "ST"},
        {"code": "LSTS", "label": "Ladies ST (State Level)", "group": "ST"},
        {"code": "GVJS", "label": "General VJ / DT-A (State Level)", "group": "VJ/NT"},
        {"code": "GNT1S", "label": "General NT-1 (NT-B State Level)", "group": "VJ/NT"},
        {"code": "GNT2S", "label": "General NT-2 (NT-C State Level)", "group": "VJ/NT"},
        {"code": "GNT3S", "label": "General NT-3 (NT-D State Level)", "group": "VJ/NT"},
        {"code": "DEFOPENS", "label": "Defence Wards - Open (State Level)", "group": "Defence"},
        {"code": "DEFOBCS", "label": "Defence Wards - OBC (State Level)", "group": "Defence"},
        {"code": "PWDOPENS", "label": "PWD - Open (State Level)", "group": "PWD"},
        {"code": "PWDOBCS", "label": "PWD - OBC (State Level)", "group": "PWD"}
    ]

@router.get("/universities")
def get_universities():
    """Return list of Maharashtra State Universities."""
    return [
        "Savitribai Phule Pune University (SPPU), Pune",
        "University of Mumbai (MU), Mumbai",
        "Dr. Babasaheb Ambedkar Marathwada University (BAMU), Chhatrapati Sambhajinagar",
        "Rashtrasant Tukadoji Maharaj Nagpur University (RTMNU), Nagpur",
        "Sant Gadge Baba Amravati University (SGBAU), Amravati",
        "Shivaji University (SUK), Kolhapur",
        "Kavayitri Bahinabai Chaudhari North Maharashtra University, Jalgaon",
        "Swami Ramanand Teerth Marathwada University (SRTMU), Nanded",
        "Dr. Babasaheb Ambedkar Technological University (BATU), Lonere"
    ]
