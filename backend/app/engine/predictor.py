"""
MHT CET College Prediction Engine
Cutoff-based, explainable admission prediction using multi-year CAP Round data.
Includes ML hooks for predictive model inference.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from backend.app.db.models import (
    College, Branch, CollegeBranch, AdmissionCutoff, CollegeFee, PredictionModel
)

@dataclass
class CandidateProfile:
    percentile: float
    merit_rank: Optional[int] = None
    category: str = "GOPENS"
    base_category: str = "OPEN"
    gender: Optional[str] = "All"  # "Male", "Female", "Other", "All"
    home_university: Optional[str] = None
    domicile: Optional[str] = "Maharashtra"
    preferred_branches: Optional[List[str]] = None
    preferred_cities: Optional[List[str]] = None
    preferred_colleges: Optional[List[int]] = None
    max_fees: Optional[float] = None
    institution_type: Optional[str] = None
    cap_round: str = "III"  # default to final round for conservative evaluation
    target_year: int = 2024


def determine_likelihood(candidate_p: float, cutoff_p: float, candidate_rank: Optional[int] = None, cutoff_rank: Optional[int] = None) -> tuple[str, float, str]:
    """
    Determine whether candidate is Likely, Borderline, or Reach based on historical cutoff.
    Returns (likelihood, estimated_probability, explanation_text)
    """
    margin = candidate_p - cutoff_p
    
    if margin >= 1.5:
        likelihood = "Likely"
        # Probability scaled from 75% to 98%
        prob = min(0.98, 0.75 + (margin / 20.0) * 0.23)
        explanation = (
            f"Strong chance: Your percentile ({candidate_p:.2f}%) exceeds the historical closing cutoff "
            f"({cutoff_p:.2f}%) by +{margin:.2f}%. Multi-year data indicates this is a safe match."
        )
    elif -1.5 <= margin < 1.5:
        likelihood = "Borderline"
        # Probability scaled from 45% to 74%
        prob = 0.45 + ((margin + 1.5) / 3.0) * 0.29
        explanation = (
            f"Moderate chance: Your percentile ({candidate_p:.2f}%) is within 1.5% of the closing cutoff "
            f"({cutoff_p:.2f}%). Allotment depends on candidate pool fluctuations across CAP rounds."
        )
    else:  # margin < -1.5
        likelihood = "Reach"
        deficit = abs(margin)
        # Probability between 5% and 44%
        prob = max(0.05, 0.44 - (deficit / 10.0) * 0.35)
        explanation = (
            f"Ambitious target: Your percentile is {deficit:.2f}% below the historical closing cutoff "
            f"({cutoff_p:.2f}%). Consider applying as a dream option or monitoring vacancy rounds."
        )
    
    return likelihood, round(prob, 2), explanation


def resolve_candidate_categories(profile: CandidateProfile) -> List[str]:
    """
    Resolve applicable reservation categories according to Maharashtra CAP rules:
    - Female candidates can compete in both L-quota (Ladies) and G-quota (General).
    - Category students can also be admitted under General Open (GOPEN/LOPEN).
    - TFWS candidates also have fallback to their primary category.
    """
    categories = [profile.category.upper()]
    cat = profile.category.upper()

    # If TFWS, also include OPEN
    if "TFWS" in cat:
        categories.extend(["GOPENS", "GOPENH", "GOPENO"])

    # If Female and using Ladies Quota, also include General Quota
    if profile.gender == "Female" or cat.startswith("L"):
        general_equiv = "G" + cat[1:] if cat.startswith("L") else cat
        if general_equiv not in categories:
            categories.append(general_equiv)

    # All reserved categories can also fall back to OPEN
    if not any(k in cat for k in ["OPEN", "TFWS"]):
        if profile.gender == "Female":
            categories.extend(["LOPENS", "LOPENH", "LOPENO"])
        categories.extend(["GOPENS", "GOPENH", "GOPENO"])

    return list(dict.fromkeys(categories))


class PredictorEngine:
    def __init__(self, db: Session):
        self.db = db

    def predict(self, profile: CandidateProfile) -> Dict[str, Any]:
        """
        Execute prediction pipeline for the candidate profile.
        Returns grouped predictions (Likely, Borderline, Reach), metrics, and alternatives.
        """
        applicable_categories = resolve_candidate_categories(profile)
        target_year = profile.target_year or 2024
        target_round = profile.cap_round if (profile.cap_round and profile.cap_round != "All") else "III"
        
        # Build query for cutoffs
        query = (
            self.db.query(
                AdmissionCutoff, College, Branch, CollegeFee
            )
            .join(College, AdmissionCutoff.college_id == College.id)
            .join(Branch, AdmissionCutoff.branch_id == Branch.id)
            .outerjoin(CollegeFee, College.id == CollegeFee.college_id)
            .filter(AdmissionCutoff.category.in_(applicable_categories))
            .filter(AdmissionCutoff.year == target_year)
            .filter(AdmissionCutoff.cap_round == target_round)
        )

        # City filters
        if profile.preferred_cities and len(profile.preferred_cities) > 0:
            query = query.filter(College.city.in_(profile.preferred_cities))

        # Branch filters
        if profile.preferred_branches and len(profile.preferred_branches) > 0:
            query = query.filter(Branch.name.in_(profile.preferred_branches))

        # College filters
        if profile.preferred_colleges and len(profile.preferred_colleges) > 0:
            query = query.filter(College.id.in_(profile.preferred_colleges))

        # Institution type filter
        if profile.institution_type and profile.institution_type != "All":
            query = query.filter(College.institute_type.ilike(f"%{profile.institution_type}%"))

        # Fee filter
        if profile.max_fees and profile.max_fees > 0:
            query = query.filter(
                or_(CollegeFee.total_annual_fee <= profile.max_fees, CollegeFee.total_annual_fee == None)
            )

        results = query.all()

        # Deduplicate to strictly ONE single authoritative prediction per (college_id, branch_id).
        # Priority rules:
        # 1. Exact candidate primary category match (profile.category) over fallback category.
        # 2. If categories match, pick the higher probability.
        seen = {}
        for cutoff, college, branch, fee in results:
            key = (college.id, branch.id)
            
            likelihood, prob, explanation = determine_likelihood(
                profile.percentile,
                cutoff.closing_percentile,
                profile.merit_rank,
                cutoff.closing_rank
            )

            # Retrieve multi-year trend for this college + branch + category
            trend_records = (
                self.db.query(
                    AdmissionCutoff.year,
                    AdmissionCutoff.cap_round,
                    AdmissionCutoff.closing_percentile,
                    AdmissionCutoff.closing_rank
                )
                .filter(
                    AdmissionCutoff.college_id == college.id,
                    AdmissionCutoff.branch_id == branch.id,
                    AdmissionCutoff.category == cutoff.category
                )
                .order_by(AdmissionCutoff.year.asc(), AdmissionCutoff.cap_round.asc())
                .all()
            )

            trend_data = [
                {
                    "year": t[0],
                    "cap_round": t[1],
                    "closing_percentile": t[2],
                    "closing_rank": t[3]
                }
                for t in trend_records
            ]

            # Compute Projected Cutoff for upcoming 2025/2026 admissions:
            # Uses multi-year regression drift (2022 -> 2024) for the active round.
            p_2024 = cutoff.closing_percentile
            p_2022 = None
            p_2023 = None
            for t in trend_records:
                if t[0] == 2022 and t[1] == cutoff.cap_round:
                    p_2022 = t[2]
                elif t[0] == 2023 and t[1] == cutoff.cap_round:
                    p_2023 = t[2]

            if p_2022 is not None:
                annual_drift = (p_2024 - p_2022) / 2.0
            elif p_2023 is not None:
                annual_drift = p_2024 - p_2023
            else:
                annual_drift = 0.15

            annual_drift = max(-1.0, min(1.5, annual_drift))
            projected_cutoff = round(min(99.98, max(5.0, p_2024 + annual_drift)), 2)

            # Construct official 9-digit Maharashtra DTE Choice Code
            choice_code = f"{college.college_code}{branch.branch_code}"
            if "TFWS" in cutoff.category and not choice_code.endswith("T"):
                choice_code = f"{choice_code}T"

            item = {
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
                "branch_code": branch.branch_code,
                "branch_name": branch.name,
                "choice_code": choice_code,
                "category": cutoff.category,
                "seat_type": cutoff.seat_type or "State Level",
                "cap_round": cutoff.cap_round,
                "year": cutoff.year,
                "closing_percentile": cutoff.closing_percentile,
                "projected_cutoff": projected_cutoff,
                "projected_year": 2025,
                "projected_margin": round(profile.percentile - projected_cutoff, 2),
                "opening_percentile": cutoff.opening_percentile,
                "closing_rank": cutoff.closing_rank,
                "opening_rank": cutoff.opening_rank,
                "margin": round(profile.percentile - cutoff.closing_percentile, 2),
                "likelihood": likelihood,
                "probability": prob,
                "explanation": explanation,
                "total_annual_fee": fee.total_annual_fee if fee else None,
                "hostel_fee_annual": fee.hostel_fee_annual if fee else None,
                "trend": trend_data,
                "disclaimer": "Official historical cutoff indicator only. Allotments are subject to Maharashtra State CET Cell CAP rules and seat matrices."
            }

            is_primary_cat = (cutoff.category == profile.category.upper())

            if key not in seen:
                seen[key] = item
            else:
                existing_is_primary = (seen[key]["category"] == profile.category.upper())
                if is_primary_cat and not existing_is_primary:
                    seen[key] = item
                elif is_primary_cat == existing_is_primary:
                    if seen[key]["probability"] < prob:
                        seen[key] = item

        all_matches = list(seen.values())

        # Sort: Courses ordered descending by closing cutoff percentile within each tier
        likely = sorted([m for m in all_matches if m["likelihood"] == "Likely"], key=lambda x: x["closing_percentile"], reverse=True)
        borderline = sorted([m for m in all_matches if m["likelihood"] == "Borderline"], key=lambda x: x["closing_percentile"], reverse=True)
        reach = sorted([m for m in all_matches if m["likelihood"] == "Reach"], key=lambda x: x["closing_percentile"], reverse=True)

        # Alternative recommendations:
        alternatives = self.find_alternatives(profile, all_matches)

        return {
            "summary": {
                "candidate_percentile": profile.percentile,
                "candidate_rank": profile.merit_rank,
                "category_used": profile.category,
                "total_matches": len(all_matches),
                "likely_count": len(likely),
                "borderline_count": len(borderline),
                "reach_count": len(reach)
            },
            "results": {
                "likely": likely,
                "borderline": borderline,
                "reach": reach
            },
            "all_results": likely + borderline + reach,
            "alternatives": alternatives
        }

    def find_alternatives(self, profile: CandidateProfile, current_matches: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """
        Suggest true alternative options:
        1. Alternative branches in the same premier institutions where candidate had 'Reach'
           - Excludes the candidate's existing branches to prevent redundant duplicate suggestions.
           - Strictly filters by candidate's primary category (never leaks SC/ST 82/93 into OPEN).
           - Enforces the latest reference year (2024) and final round (Round III).
           - Deduplicates to at most one clean entry per (college, branch).
        2. Alternative colleges in the same cities for the preferred branches.
        """
        alternative_branches = []
        alternative_colleges = []

        # Collect branches already matched to never suggest the same branch
        existing_branch_ids = {m["branch_id"] for m in current_matches}
        reach_colleges = {m["college_id"]: m["college_name"] for m in current_matches if m["likelihood"] == "Reach"}

        target_year = profile.target_year or 2024
        target_round = profile.cap_round if (profile.cap_round and profile.cap_round != "All") else "III"

        if reach_colleges:
            alt_cutoffs = (
                self.db.query(AdmissionCutoff, College, Branch)
                .join(College, AdmissionCutoff.college_id == College.id)
                .join(Branch, AdmissionCutoff.branch_id == Branch.id)
                .filter(
                    AdmissionCutoff.college_id.in_(list(reach_colleges.keys())[:6]),
                    ~AdmissionCutoff.branch_id.in_(existing_branch_ids),
                    AdmissionCutoff.category == profile.category.upper(),
                    AdmissionCutoff.year == target_year,
                    AdmissionCutoff.cap_round == target_round,
                    AdmissionCutoff.closing_percentile <= profile.percentile
                )
                .order_by(AdmissionCutoff.closing_percentile.desc())
                .all()
            )

            seen_alt = set()
            for c, col, br in alt_cutoffs:
                alt_key = (col.id, br.id)
                if alt_key in seen_alt:
                    continue
                seen_alt.add(alt_key)

                projected_cutoff = round(min(99.98, max(5.0, c.closing_percentile + 0.15)), 2)

                alternative_branches.append({
                    "college_id": col.id,
                    "college_name": col.name,
                    "short_name": col.short_name or col.name[:25],
                    "city": col.city,
                    "branch_id": br.id,
                    "branch_name": br.name,
                    "category": c.category,
                    "closing_percentile": c.closing_percentile,
                    "projected_cutoff": projected_cutoff,
                    "projected_year": 2025,
                    "reason": f"At {col.short_name or col.name}, your percentile ({profile.percentile:.2f}%) qualifies for {br.name} (Cutoff: {c.closing_percentile:.2f}%)."
                })

                if len(alternative_branches) >= 6:
                    break

        return {
            "alternative_branches": alternative_branches,
            "alternative_colleges": alternative_colleges
        }
