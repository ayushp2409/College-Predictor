from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.db.session import get_db
from backend.app.db.models import College, Branch, CollegeBranch, AdmissionCutoff, CollegeFee

router = APIRouter(prefix="/colleges", tags=["Colleges & Branches"])

@router.get("")
def list_colleges(
    search: Optional[str] = Query(None, description="Search by college name, code, or city"),
    city: Optional[str] = Query(None, description="Filter by city"),
    institute_type: Optional[str] = Query(None, description="Filter by institute type"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """List colleges with search, filters, and pagination."""
    query = db.query(College)

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter(
            (College.name.ilike(search_filter)) |
            (College.college_code.ilike(search_filter)) |
            (College.city.ilike(search_filter)) |
            (College.short_name.ilike(search_filter))
        )

    if city and city != "All":
        query = query.filter(College.city == city)

    if institute_type and institute_type != "All":
        query = query.filter(College.institute_type.ilike(f"%{institute_type}%"))

    total = query.count()
    offset = (page - 1) * limit
    colleges = query.order_by(College.name.asc()).offset(offset).limit(limit).all()

    items = []
    for c in colleges:
        fee = db.query(CollegeFee).filter(CollegeFee.college_id == c.id).first()
        branch_count = db.query(CollegeBranch).filter(CollegeBranch.college_id == c.id).count()
        items.append({
            "id": c.id,
            "college_code": c.college_code,
            "name": c.name,
            "short_name": c.short_name or c.name[:25],
            "city": c.city,
            "district": c.district,
            "university": c.university,
            "institute_type": c.institute_type,
            "autonomy_status": c.autonomy_status,
            "rating": c.rating or 4.0,
            "nirf_ranking": c.nirf_ranking,
            "website": c.website,
            "established_year": c.established_year,
            "branches_count": branch_count,
            "total_annual_fee": fee.total_annual_fee if fee else None
        })

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit else 1,
        "items": items
    }

@router.get("/{college_id}")
def get_college_details(college_id: int, db: Session = Depends(get_db)):
    """Get full details of a college including offered branches and fees."""
    college = db.query(College).filter(College.id == college_id).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")

    fee = db.query(CollegeFee).filter(CollegeFee.college_id == college.id).first()
    
    # Offered branches sorted in descending order of closing cutoff percentile
    c_branches = (
        db.query(CollegeBranch, Branch)
        .join(Branch, CollegeBranch.branch_id == Branch.id)
        .filter(CollegeBranch.college_id == college.id)
        .all()
    )

    branches_data = []
    for cb, b in c_branches:
        latest_cutoff = (
            db.query(AdmissionCutoff)
            .filter(
                AdmissionCutoff.college_id == college.id,
                AdmissionCutoff.branch_id == b.id,
                AdmissionCutoff.category == "GOPENS"
            )
            .order_by(AdmissionCutoff.year.desc(), AdmissionCutoff.cap_round.desc())
            .first()
        )
        cutoff_val = latest_cutoff.closing_percentile if latest_cutoff else 0.0
        closing_rank = latest_cutoff.closing_rank if latest_cutoff else None

        branches_data.append({
            "branch_id": b.id,
            "branch_code": b.branch_code,
            "branch_name": b.name,
            "course_code": cb.course_code or f"{college.college_code}{b.branch_code}",
            "sanctioned_intake": cb.sanctioned_intake,
            "accreditation_status": cb.accreditation_status,
            "closing_percentile": cutoff_val,
            "closing_rank": closing_rank
        })

    # Strictly sort courses in descending order of cutoff percentile
    branches_data.sort(key=lambda x: x["closing_percentile"], reverse=True)

    return {
        "id": college.id,
        "college_code": college.college_code,
        "name": college.name,
        "short_name": college.short_name or college.name[:25],
        "city": college.city,
        "district": college.district,
        "university": college.university,
        "institute_type": college.institute_type,
        "autonomy_status": college.autonomy_status,
        "rating": college.rating or 4.0,
        "nirf_ranking": college.nirf_ranking,
        "website": college.website,
        "established_year": college.established_year,
        "fee_structure": {
            "tuition_fee": fee.tuition_fee if fee else None,
            "development_fee": fee.development_fee if fee else None,
            "total_annual_fee": fee.total_annual_fee if fee else None,
            "hostel_fee_annual": fee.hostel_fee_annual if fee else None,
            "category_concessions": fee.category_concessions if fee else {}
        } if fee else None,
        "branches": branches_data
    }

@router.get("/branches/list")
def list_branches(db: Session = Depends(get_db)):
    """Return all unique engineering branches."""
    branches = db.query(Branch).order_by(Branch.name.asc()).all()
    return [{"id": b.id, "branch_code": b.branch_code, "name": b.name} for b in branches]

@router.get("/cities/list")
def list_cities(db: Session = Depends(get_db)):
    """Return distinct cities in the database."""
    cities = db.query(College.city).distinct().order_by(College.city.asc()).all()
    return [c[0] for c in cities if c[0]]

@router.get("/trends/history")
def get_cutoff_trends(
    college_id: int = Query(...),
    branch_id: int = Query(...),
    category: str = Query("GOPENS"),
    db: Session = Depends(get_db)
):
    """Retrieve multi-year historical cutoff progression across CAP rounds."""
    cutoffs = (
        db.query(AdmissionCutoff)
        .filter(
            AdmissionCutoff.college_id == college_id,
            AdmissionCutoff.branch_id == branch_id,
            AdmissionCutoff.category == category
        )
        .order_by(AdmissionCutoff.year.asc(), AdmissionCutoff.cap_round.asc())
        .all()
    )

    return [
        {
            "year": c.year,
            "cap_round": c.cap_round,
            "closing_percentile": c.closing_percentile,
            "opening_percentile": c.opening_percentile,
            "closing_rank": c.closing_rank,
            "opening_rank": c.opening_rank
        }
        for c in cutoffs
    ]
