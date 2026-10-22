from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import College, Branch, CollegeBranch, AdmissionCutoff, CollegeFee
from backend.app.engine.predictor import determine_likelihood

router = APIRouter(prefix="/compare", tags=["College Comparison"])

class CompareItem(BaseModel):
    college_id: int
    branch_id: int

class CompareRequest(BaseModel):
    items: List[CompareItem] = Field(..., min_length=2, max_length=4, description="Select 2 to 4 options to compare")
    category: str = Field("GOPENS", description="Seat Category for cutoff comparison")
    candidate_percentile: Optional[float] = Field(None, ge=0.0, le=100.0, description="Optional percentile for side-by-side likelihood")

@router.post("", response_model=Dict[str, Any])
def compare_colleges(request: CompareRequest, db: Session = Depends(get_db)):
    """
    Compare 2 to 4 college & branch options side-by-side across cutoffs, fees, intake, rating, and location.
    """
    if len(request.items) < 2 or len(request.items) > 4:
        raise HTTPException(status_code=400, detail="Must provide between 2 and 4 options to compare.")

    comparison_results = []
    
    for item in request.items:
        college = db.query(College).filter(College.id == item.college_id).first()
        branch = db.query(Branch).filter(Branch.id == item.branch_id).first()
        
        if not college or not branch:
            continue

        fee = db.query(CollegeFee).filter(CollegeFee.college_id == college.id).first()
        cb = db.query(CollegeBranch).filter(
            CollegeBranch.college_id == college.id,
            CollegeBranch.branch_id == branch.id
        ).first()

        # Fetch recent cutoffs
        cutoffs_2024 = (
            db.query(AdmissionCutoff)
            .filter(
                AdmissionCutoff.college_id == college.id,
                AdmissionCutoff.branch_id == branch.id,
                AdmissionCutoff.year == 2024,
                AdmissionCutoff.category == request.category
            )
            .order_by(AdmissionCutoff.cap_round.asc())
            .all()
        )

        cutoffs_2023 = (
            db.query(AdmissionCutoff)
            .filter(
                AdmissionCutoff.college_id == college.id,
                AdmissionCutoff.branch_id == branch.id,
                AdmissionCutoff.year == 2023,
                AdmissionCutoff.category == request.category
            )
            .order_by(AdmissionCutoff.cap_round.asc())
            .all()
        )

        # Likelihood if percentile provided
        latest_cutoff = cutoffs_2024[-1] if cutoffs_2024 else (cutoffs_2023[-1] if cutoffs_2023 else None)
        likelihood_data = None
        if request.candidate_percentile is not None and latest_cutoff:
            lhood, prob, expl = determine_likelihood(
                request.candidate_percentile,
                latest_cutoff.closing_percentile
            )
            likelihood_data = {
                "likelihood": lhood,
                "probability": prob,
                "margin": round(request.candidate_percentile - latest_cutoff.closing_percentile, 2),
                "explanation": expl
            }

        comparison_results.append({
            "college_id": college.id,
            "college_code": college.college_code,
            "college_name": college.name,
            "short_name": college.short_name or college.name[:25],
            "city": college.city,
            "university": college.university or "Maharashtra State",
            "institute_type": college.institute_type,
            "autonomy_status": college.autonomy_status,
            "rating": college.rating or 4.0,
            "nirf_ranking": college.nirf_ranking,
            "website": college.website,
            "branch_id": branch.id,
            "branch_name": branch.name,
            "sanctioned_intake": cb.sanctioned_intake if cb else 60,
            "accreditation_status": cb.accreditation_status if cb else "NBA Accredited",
            "fees": {
                "tuition_fee": fee.tuition_fee if fee else None,
                "total_annual_fee": fee.total_annual_fee if fee else None,
                "hostel_fee_annual": fee.hostel_fee_annual if fee else None
            } if fee else None,
            "cutoffs_2024": [
                {
                    "round": c.cap_round,
                    "closing_percentile": c.closing_percentile,
                    "closing_rank": c.closing_rank
                } for c in cutoffs_2024
            ],
            "cutoffs_2023": [
                {
                    "round": c.cap_round,
                    "closing_percentile": c.closing_percentile,
                    "closing_rank": c.closing_rank
                } for c in cutoffs_2023
            ],
            "likelihood_eval": likelihood_data
        })

    return {
        "count": len(comparison_results),
        "category": request.category,
        "options": comparison_results
    }
