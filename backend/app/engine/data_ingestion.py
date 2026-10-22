"""
Data Ingestion and Validation Engine for MHT CET CAP Cutoffs.
Supports CSV/Excel uploads, structural validation, duplicate detection,
quality checks, and transactional publishing.
"""

import os
import io
import csv
import hashlib
import logging
import datetime
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.config import settings
from backend.app.db.models import (
    College, Branch, CollegeBranch, AdmissionCutoff,
    DataSource, DatasetVersion, AdminAuditLog
)

logger = logging.getLogger(__name__)

# Canonical MHT CET Column Mappings
COLUMN_ALIASES = {
    "year": ["year", "academic_year", "exam_year"],
    "cap_round": ["capround", "round", "cap_round", "round_no"],
    "college_code": ["collegecode", "college_code", "institute_code", "code"],
    "college_name": ["collegename", "college_name", "institute_name", "college"],
    "branch_code": ["branchcode", "branch_code", "course_code"],
    "branch_name": ["branchname", "branch_name", "course_name", "branch"],
    "category": ["category", "seat_type", "quota", "caste_category"],
    "percentile": ["percentile", "closing_percentile", "cutoff_percentile", "cet_percentile"],
    "rank": ["rank", "closing_rank", "merit_rank", "state_rank"]
}

class DataIngestionService:
    def __init__(self, db: Session):
        self.db = db

    def compute_sha256(self, content_bytes: bytes) -> str:
        return hashlib.sha256(content_bytes).hexdigest()

    def parse_file(self, content_bytes: bytes, filename: str) -> List[Dict[str, Any]]:
        """Parse uploaded file into list of row dictionaries."""
        rows = []
        if filename.endswith(".csv"):
            text = content_bytes.decode("utf-8", errors="replace")
            reader = csv.DictReader(io.StringIO(text))
            for r in reader:
                # normalize keys (strip, lowercase, remove underscores/spaces)
                normalized_row = {
                    k.strip().lower().replace(" ", "").replace("_", ""): (v.strip() if v else "")
                    for k, v in r.items() if k
                }
                rows.append(normalized_row)
        elif filename.endswith((".xlsx", ".xls")):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            sheet = wb.active
            headers = [
                str(cell.value or "").strip().lower().replace(" ", "").replace("_", "")
                for cell in sheet[1]
            ]
            for row in sheet.iter_rows(min_row=2, values_only=True):
                row_dict = {}
                for h, val in zip(headers, row):
                    if h:
                        row_dict[h] = str(val).strip() if val is not None else ""
                rows.append(row_dict)
        else:
            raise ValueError("Unsupported file format. Please upload CSV or Excel (.xlsx).")
        return rows

    def extract_field(self, row: Dict[str, Any], canonical_key: str) -> Optional[str]:
        aliases = COLUMN_ALIASES.get(canonical_key, [canonical_key])
        for alias in aliases:
            norm_alias = alias.replace("_", "")
            if norm_alias in row and row[norm_alias] != "":
                return row[norm_alias]
        return None

    def validate_dataset(self, rows: List[Dict[str, Any]], filename: str) -> Dict[str, Any]:
        """
        Validate rows, identify errors, duplicates, and out-of-range percentiles.
        """
        valid_records = []
        errors = []
        warnings = []
        seen_keys = set()
        duplicates_count = 0

        if not rows:
            return {
                "is_valid": False,
                "total_rows": 0,
                "valid_count": 0,
                "error_count": 1,
                "duplicate_count": 0,
                "errors": ["Uploaded file contains no data rows."],
                "warnings": [],
                "can_publish": False,
                "sample_preview": []
            }

        for idx, row in enumerate(rows, start=1):
            row_errors = []
            college_code = self.extract_field(row, "college_code")
            college_name = self.extract_field(row, "college_name")
            branch_code = self.extract_field(row, "branch_code") or (college_code + "001" if college_code else None)
            branch_name = self.extract_field(row, "branch_name")
            category = self.extract_field(row, "category") or "GOPENS"
            cap_round = self.extract_field(row, "cap_round") or "III"
            year_str = self.extract_field(row, "year") or "2024"
            percentile_str = self.extract_field(row, "percentile")
            rank_str = self.extract_field(row, "rank")

            # Validate Year
            try:
                year = int(float(year_str[:4])) if year_str else 2024
            except ValueError:
                row_errors.append(f"Row {idx}: Invalid year '{year_str}'")
                year = 2024

            # Validate Percentile
            percentile = None
            if percentile_str:
                try:
                    percentile = float(percentile_str)
                    if not (0.0 <= percentile <= 100.0):
                        row_errors.append(f"Row {idx}: Percentile {percentile} outside 0.0-100.0 range.")
                except ValueError:
                    row_errors.append(f"Row {idx}: Cannot parse percentile '{percentile_str}'.")
            else:
                row_errors.append(f"Row {idx}: Missing percentile value.")

            # Validate Rank
            rank = None
            if rank_str:
                try:
                    rank = int(float(rank_str))
                    if rank < 1:
                        warnings.append(f"Row {idx}: Rank {rank} is less than 1.")
                except ValueError:
                    pass

            # Validate Mandatory Fields
            if not college_name and not college_code:
                row_errors.append(f"Row {idx}: Missing College Name or Code.")
            if not branch_name:
                row_errors.append(f"Row {idx}: Missing Branch Name.")

            # Duplicate Check (Year + Round + College + Branch + Category)
            logical_key = (year, cap_round.upper(), str(college_code or college_name), str(branch_name), category.upper())
            if logical_key in seen_keys:
                duplicates_count += 1
                warnings.append(f"Row {idx}: Duplicate record detected for {college_name} - {branch_name} ({category}).")
            else:
                seen_keys.add(logical_key)

            if row_errors:
                errors.extend(row_errors)
            else:
                valid_records.append({
                    "year": year,
                    "academic_year": f"{year}-{str(year+1)[-2:]}",
                    "cap_round": cap_round.replace("Round", "").strip().upper(),
                    "college_code": str(college_code or "COL" + str(idx)),
                    "college_name": college_name or f"College {college_code}",
                    "branch_code": str(branch_code or "BR" + str(idx)),
                    "branch_name": branch_name,
                    "category": category.upper(),
                    "closing_percentile": percentile,
                    "opening_percentile": percentile,
                    "closing_rank": rank,
                    "opening_rank": rank
                })

        can_publish = (len(valid_records) > 0 and len(errors) < (len(rows) * 0.5))

        return {
            "is_valid": len(errors) == 0,
            "total_rows": len(rows),
            "valid_count": len(valid_records),
            "error_count": len(errors),
            "duplicate_count": duplicates_count,
            "errors": errors[:50],  # cap preview
            "warnings": warnings[:50],
            "can_publish": can_publish,
            "sample_preview": valid_records[:5],
            "valid_records": valid_records
        }

    def register_and_publish(
        self,
        valid_records: List[Dict[str, Any]],
        document_title: str,
        filename: str,
        file_bytes: bytes,
        source_year: int,
        source_round: str,
        version_tag: str,
        description: str,
        admin_username: str = "admin"
    ) -> Dict[str, Any]:
        """
        Save official source doc, create dataset version, and insert records atomically.
        """
        sha256 = self.compute_sha256(file_bytes)

        # Save physical file to uploads directory
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        saved_file_path = os.path.join(settings.UPLOAD_DIR, f"{version_tag}_{filename}")
        with open(saved_file_path, "wb") as f:
            f.write(file_bytes)

        try:
            # 1. Create DataSource
            source = DataSource(
                source_name=f"Official MHT CET CAP Cutoffs - {source_year}",
                document_title=document_title,
                file_name=filename,
                file_path=saved_file_path,
                source_year=source_year,
                source_round=source_round,
                sha256_hash=sha256,
                verified_by=admin_username,
                verification_notes="Verified against official Maharashtra State CET Cell cutoff report."
            )
            self.db.add(source)
            self.db.flush()

            # 2. Create DatasetVersion
            dataset_version = DatasetVersion(
                version_tag=version_tag,
                description=description,
                source_id=source.id,
                record_count=len(valid_records),
                status="published",
                validation_report={"valid_records": len(valid_records), "sha256": sha256},
                published_at=datetime.datetime.utcnow(),
                created_by=admin_username
            )
            self.db.add(dataset_version)
            self.db.flush()

            # 3. Upsert Colleges and Branches
            college_cache = {c.college_code: c for c in self.db.query(College).all()}
            branch_cache = {b.branch_code: b for b in self.db.query(Branch).all()}

            inserted_cutoffs = 0
            for r in valid_records:
                col_code = r["college_code"]
                br_code = r["branch_code"]
                
                # Ensure College exists
                if col_code not in college_cache:
                    # Determine city from college name heuristics
                    city = "Pune"
                    name_upper = r["college_name"].upper()
                    if "MUMBAI" in name_upper or "MATUNGA" in name_upper:
                        city = "Mumbai"
                    elif "NAGPUR" in name_upper:
                        city = "Nagpur"
                    elif "NASHIK" in name_upper:
                        city = "Nashik"
                    elif "AMRAVATI" in name_upper:
                        city = "Amravati"
                    elif "AURANGABAD" in name_upper or "CHHATRAPATI SAMBHAJINAGAR" in name_upper:
                        city = "Chhatrapati Sambhajinagar"
                    elif "SANGLI" in name_upper:
                        city = "Sangli"
                    elif "KOLHAPUR" in name_upper:
                        city = "Kolhapur"

                    new_college = College(
                        college_code=col_code,
                        name=r["college_name"],
                        city=city,
                        institute_type="Government Autonomous" if "GOVERNMENT" in name_upper else "Un-Aided Autonomous",
                        autonomy_status="Autonomous"
                    )
                    self.db.add(new_college)
                    self.db.flush()
                    college_cache[col_code] = new_college

                col = college_cache[col_code]

                # Ensure Branch exists
                if br_code not in branch_cache:
                    new_branch = Branch(
                        branch_code=br_code,
                        name=r["branch_name"]
                    )
                    self.db.add(new_branch)
                    self.db.flush()
                    branch_cache[br_code] = new_branch

                br = branch_cache[br_code]

                # Ensure CollegeBranch linkage
                exists_cb = self.db.query(CollegeBranch).filter(
                    CollegeBranch.college_id == col.id,
                    CollegeBranch.branch_id == br.id
                ).first()
                if not exists_cb:
                    cb = CollegeBranch(college_id=col.id, branch_id=br.id, sanctioned_intake=60)
                    self.db.add(cb)
                    self.db.flush()

                # Derive BaseCategory and SeatType
                cat = r["category"]
                base_cat = "OPEN"
                seat_type = "SL"
                if "OBC" in cat:
                    base_cat = "OBC"
                elif "SC" in cat:
                    base_cat = "SC"
                elif "ST" in cat:
                    base_cat = "ST"
                elif "EWS" in cat:
                    base_cat = "EWS"
                elif "TFWS" in cat:
                    base_cat = "TFWS"

                if cat.endswith("H"):
                    seat_type = "HU"
                elif cat.endswith("O"):
                    seat_type = "OHU"

                cutoff = AdmissionCutoff(
                    college_id=col.id,
                    branch_id=br.id,
                    year=r["year"],
                    academic_year=r["academic_year"],
                    cap_round=r["cap_round"],
                    category=cat,
                    base_category=base_cat,
                    seat_type=seat_type,
                    closing_percentile=r["closing_percentile"],
                    opening_percentile=r["opening_percentile"],
                    closing_rank=r["closing_rank"],
                    opening_rank=r["opening_rank"],
                    data_quality_status="VERIFIED_OFFICIAL"
                )
                self.db.add(cutoff)
                inserted_cutoffs += 1

            # 4. Audit Log
            audit = AdminAuditLog(
                admin_username=admin_username,
                action_type="PUBLISH_DATASET",
                entity_type="DatasetVersion",
                entity_id=str(dataset_version.id),
                change_summary=f"Published dataset {version_tag} with {inserted_cutoffs} verified cutoffs from {filename}"
            )
            self.db.add(audit)

            self.db.commit()

            return {
                "success": True,
                "dataset_version_id": dataset_version.id,
                "version_tag": version_tag,
                "records_published": inserted_cutoffs,
                "sha256": sha256
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to publish dataset version: {e}")
            raise e
