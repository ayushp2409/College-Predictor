import pytest
from backend.app.engine.data_ingestion import DataIngestionService

def test_parse_csv_content():
    service = DataIngestionService(db=None)
    csv_bytes = (
        "Year,CAPRound,CollegeCode,CollegeName,BranchCode,BranchName,Category,Percentile,Rank\n"
        "2024,III,6006,COEP Technological University,600624510,Computer Engineering,GOPENS,99.82,210\n"
        "2024,III,3012,VJTI Mumbai,301224510,Computer Engineering,GOPENS,99.91,120\n"
    ).encode("utf-8")

    rows = service.parse_file(csv_bytes, "cutoffs.csv")
    assert len(rows) == 2
    assert rows[0]["collegecode"] == "6006"
    assert rows[1]["collegename"] == "VJTI Mumbai"

def test_validate_dataset_valid():
    service = DataIngestionService(db=None)
    rows = [
        {
            "year": "2024",
            "capround": "III",
            "collegecode": "6006",
            "collegename": "COEP Tech",
            "branchcode": "600624510",
            "branchname": "Computer Engineering",
            "category": "GOPENS",
            "percentile": "99.85",
            "rank": "190"
        }
    ]
    report = service.validate_dataset(rows, "test.csv")
    assert report["is_valid"] is True
    assert report["valid_count"] == 1
    assert report["error_count"] == 0
    assert report["can_publish"] is True

def test_validate_dataset_invalid_percentile():
    service = DataIngestionService(db=None)
    rows = [
        {
            "year": "2024",
            "capround": "III",
            "collegecode": "6006",
            "collegename": "COEP Tech",
            "branchname": "Computer Engineering",
            "percentile": "105.5"  # invalid!
        }
    ]
    report = service.validate_dataset(rows, "test.csv")
    assert report["is_valid"] is False
    assert report["error_count"] > 0
    assert any("0.0-100.0" in err for err in report["errors"])

def test_validate_dataset_duplicate_detection():
    service = DataIngestionService(db=None)
    rows = [
        {
            "year": "2024",
            "capround": "III",
            "collegecode": "6006",
            "collegename": "COEP Tech",
            "branchname": "Computer Engineering",
            "category": "GOPENS",
            "percentile": "99.85"
        },
        {
            "year": "2024",
            "capround": "III",
            "collegecode": "6006",
            "collegename": "COEP Tech",
            "branchname": "Computer Engineering",
            "category": "GOPENS",
            "percentile": "99.70"
        }
    ]
    report = service.validate_dataset(rows, "test.csv")
    assert report["duplicate_count"] == 1
    assert any("Duplicate" in w for w in report["warnings"])
