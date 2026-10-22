import io
import csv
import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.app.db.session import get_db
from backend.app.db.models import SavedShortlist, College, Branch, CollegeFee
from backend.app.api.deps import oauth2_scheme, get_current_user, User

router = APIRouter(prefix="/shortlist", tags=["Shortlist & Reports"])

class ShortlistCreate(BaseModel):
    student_session_id: str
    college_id: int
    branch_id: int
    likelihood: Optional[str] = "Likely"
    candidate_percentile: Optional[float] = None
    notes: Optional[str] = None

class ExportPredictionItem(BaseModel):
    college_name: str
    city: str
    branch_name: str
    likelihood: str
    closing_percentile: float
    margin: float
    total_annual_fee: Optional[float] = None

class ExportRequest(BaseModel):
    student_name: Optional[str] = "Student Candidate"
    percentile: float
    merit_rank: Optional[int] = None
    category: str = "GOPENS"
    items: List[ExportPredictionItem]

class ChoiceListItem(BaseModel):
    preference_no: int
    choice_code: str
    college_code: str
    college_name: str
    city: str
    branch_code: str
    branch_name: str
    seat_type: str = "GOPENS"
    likelihood: str = "Likely"
    closing_percentile: float
    closing_rank: Optional[int] = None
    total_annual_fee: Optional[float] = None
    autonomy_status: Optional[str] = None

class CapOptionFormExportRequest(BaseModel):
    student_name: Optional[str] = "MHT CET Aspirant"
    application_id: Optional[str] = "EN24108593"
    percentile: float
    merit_rank: Optional[int] = None
    category: str = "GOPENS"
    gender: Optional[str] = "Male"
    home_university: Optional[str] = "Savitribai Phule Pune University"
    candidate_type: Optional[str] = "Maharashtra State Type A"
    cap_round: Optional[str] = "CAP Round I / II / III"
    choices: List[ChoiceListItem]

@router.post("")
def add_to_shortlist(item: ShortlistCreate, db: Session = Depends(get_db)):
    """Add a college-branch option to the student's saved shortlist."""
    exists = db.query(SavedShortlist).filter(
        SavedShortlist.student_session_id == item.student_session_id,
        SavedShortlist.college_id == item.college_id,
        SavedShortlist.branch_id == item.branch_id
    ).first()

    if exists:
        exists.likelihood = item.likelihood
        exists.notes = item.notes
        exists.candidate_percentile = item.candidate_percentile
        db.commit()
        db.refresh(exists)
        return {"message": "Shortlist item updated", "id": exists.id}

    new_item = SavedShortlist(
        student_session_id=item.student_session_id,
        college_id=item.college_id,
        branch_id=item.branch_id,
        likelihood=item.likelihood,
        candidate_percentile=item.candidate_percentile,
        notes=item.notes
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return {"message": "Saved to shortlist", "id": new_item.id}

@router.get("")
def get_shortlist(
    session_id: str = Query(..., description="Student anonymous session ID or user key"),
    db: Session = Depends(get_db)
):
    """Retrieve all shortlisted colleges for a given student session."""
    items = (
        db.query(SavedShortlist, College, Branch, CollegeFee)
        .join(College, SavedShortlist.college_id == College.id)
        .join(Branch, SavedShortlist.branch_id == Branch.id)
        .outerjoin(CollegeFee, College.id == CollegeFee.college_id)
        .filter(SavedShortlist.student_session_id == session_id)
        .order_by(SavedShortlist.created_at.desc())
        .all()
    )

    results = []
    for s, c, b, f in items:
        results.append({
            "shortlist_id": s.id,
            "college_id": c.id,
            "college_code": c.college_code,
            "college_name": c.name,
            "short_name": c.short_name or c.name[:25],
            "city": c.city,
            "branch_id": b.id,
            "branch_name": b.name,
            "likelihood": s.likelihood,
            "candidate_percentile": s.candidate_percentile,
            "notes": s.notes,
            "total_annual_fee": f.total_annual_fee if f else None,
            "created_at": s.created_at.isoformat() if s.created_at else None
        })

    return results

@router.delete("/{shortlist_id}")
def remove_from_shortlist(shortlist_id: int, db: Session = Depends(get_db)):
    """Remove an option from the shortlist."""
    item = db.query(SavedShortlist).filter(SavedShortlist.id == shortlist_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found.")
    db.delete(item)
    db.commit()
    return {"message": "Item removed from shortlist"}

@router.post("/export/csv")
def export_csv(payload: ExportRequest):
    """Export prediction shortlist as CSV file."""
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow(["MHT CET College Predictor - Report"])
    writer.writerow([f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"])
    writer.writerow([f"Candidate Percentile: {payload.percentile}%", f"Category: {payload.category}", f"Merit Rank: {payload.merit_rank or 'N/A'}"])
    writer.writerow([])
    writer.writerow(["College Name", "City", "Branch Name", "Likelihood", "Closing Cutoff (%)", "Margin (%)", "Annual Fee (INR)"])

    for item in payload.items:
        writer.writerow([
            item.college_name,
            item.city,
            item.branch_name,
            item.likelihood,
            f"{item.closing_percentile:.2f}",
            f"{item.margin:+.2f}",
            f"{int(item.total_annual_fee)}" if item.total_annual_fee else "N/A"
        ])

    writer.writerow([])
    writer.writerow(["Disclaimer: Historical cutoff indicator based on official CAP data. Seat allotment is not guaranteed."])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=mht_cet_prediction_{datetime.date.today()}.csv"}
    )

@router.post("/export/pdf")
def export_pdf(payload: ExportRequest):
    """Generate structured PDF report of prediction shortlist using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=6
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14
    )
    disclaimer_style = ParagraphStyle(
        'DocDisc',
        parent=styles['Italic'],
        fontName='Helvetica-Oblique',
        fontSize=8,
        textColor=colors.HexColor("#64748b"),
        spaceBefore=14
    )

    story = []
    
    # Title & Metadata
    story.append(Paragraph("MHT CET College Predictor — Candidate Report", title_style))
    meta_text = (
        f"<b>Candidate:</b> {payload.student_name} | "
        f"<b>Percentile:</b> {payload.percentile:.2f}% | "
        f"<b>Category:</b> {payload.category} | "
        f"<b>State Merit Rank:</b> {payload.merit_rank or 'N/A'} | "
        f"<b>Date:</b> {datetime.datetime.now().strftime('%d %b %Y')}"
    )
    story.append(Paragraph(meta_text, subtitle_style))
    story.append(Spacer(1, 10))

    # Table Data
    table_data = [
        ["College Name", "City", "Branch", "Likelihood", "Cutoff", "Margin", "Annual Fee"]
    ]

    for item in payload.items:
        fee_str = f"Rs. {int(item.total_annual_fee):,}" if item.total_annual_fee else "N/A"
        col_name_wrapped = Paragraph(f"<b>{item.college_name[:40]}</b>", styles['Normal'])
        branch_wrapped = Paragraph(item.branch_name[:30], styles['Normal'])
        
        table_data.append([
            col_name_wrapped,
            item.city,
            branch_wrapped,
            item.likelihood,
            f"{item.closing_percentile:.2f}%",
            f"{item.margin:+.2f}%",
            fee_str
        ])

    col_widths = [160, 55, 120, 60, 50, 45, 50]
    report_table = Table(table_data, colWidths=col_widths, repeatRows=1)
    
    report_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('FONTSIZE', (0, 1), (-1, -1), 8),
    ]))

    story.append(report_table)
    story.append(Spacer(1, 12))
    
    # Disclaimer
    disclaimer = (
        "<b>Important Notice & Limitations:</b> Predictions are generated using verified historical CAP admission cutoffs "
        "published by the Maharashtra State CET Cell. Cutoffs vary each year based on seat capacity, applicant preferences, "
        "and reservation matrices. This report is an analytical guidance tool and does NOT guarantee allotment."
    )
    story.append(Paragraph(disclaimer, disclaimer_style))

    doc.build(story)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=mhtcet_predictions_{datetime.date.today()}.pdf"}
    )

@router.post("/cap-option-form/export/csv")
def export_cap_option_form_csv(payload: CapOptionFormExportRequest):
    """
    Export official CAP Round Choice Code list formatted for direct use
    in the Maharashtra State CET Cell engineering option form portal.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["GOVERNMENT OF MAHARASHTRA - STATE COMMON ENTRANCE TEST CELL"])
    writer.writerow(["MHT CET CENTRALIZED ADMISSION PROCESS (CAP) - OPTION FORM PREFERENCE LIST"])
    writer.writerow([f"Generated Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"])
    writer.writerow([
        f"Candidate Name: {payload.student_name}",
        f"Application ID: {payload.application_id}",
        f"Percentile: {payload.percentile}%",
        f"Category: {payload.category}",
        f"Merit Rank: {payload.merit_rank or 'N/A'}"
    ])
    writer.writerow([])
    writer.writerow([
        "Preference No",
        "Choice Code (9-Digit DTE)",
        "Institute Code",
        "Institute Name",
        "Course / Branch Name",
        "Seat Quota",
        "Autonomy Status",
        "Likelihood",
        "Historical Closing Cutoff (%)",
        "Closing Rank",
        "Annual Fee (INR)"
    ])

    for choice in payload.choices:
        writer.writerow([
            choice.preference_no,
            choice.choice_code,
            choice.college_code,
            choice.college_name,
            choice.branch_name,
            choice.seat_type,
            choice.autonomy_status or "Autonomous",
            choice.likelihood,
            f"{choice.closing_percentile:.2f}",
            choice.closing_rank or "N/A",
            int(choice.total_annual_fee) if choice.total_annual_fee else "CAP Fee Matrix"
        ])

    writer.writerow([])
    writer.writerow([
        "Note: Fill these verified 9-digit choice codes in exact sequence on the official cetcell.mahacet.org portal."
    ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=mhtcet_cap_choice_list_{datetime.date.today()}.csv"}
    )

@router.post("/cap-option-form/export/pdf")
def export_cap_option_form_pdf(payload: CapOptionFormExportRequest):
    """
    Generate official-styled CAP Choice Code Option Form PDF ready for counseling and locking.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=28,
        leftMargin=28,
        topMargin=28,
        bottomMargin=28
    )

    styles = getSampleStyleSheet()

    header_style = ParagraphStyle(
        'CapHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        alignment=1, # Center
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2
    )

    sub_header_style = ParagraphStyle(
        'CapSubHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        alignment=1, # Center
        textColor=colors.HexColor("#1e3a8a"),
        spaceAfter=8
    )

    meta_cell_style = ParagraphStyle(
        'CapMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e293b")
    )

    table_cell_style = ParagraphStyle(
        'CapCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a")
    )

    table_code_style = ParagraphStyle(
        'CapCode',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1e3a8a")
    )

    story = []

    # 1. State CET Cell Emulation Title
    story.append(Paragraph("STATE COMMON ENTRANCE TEST CELL, MAHARASHTRA STATE", header_style))
    story.append(Paragraph("MHT CET Centralized Admission Process (CAP) — Candidate Option Form (Preference List)", sub_header_style))
    story.append(Spacer(1, 4))

    # 2. Candidate Particulars Table
    meta_table_data = [
        [
            Paragraph(f"<b>Candidate Name:</b> {payload.student_name}", meta_cell_style),
            Paragraph(f"<b>Application ID:</b> {payload.application_id}", meta_cell_style),
            Paragraph(f"<b>MHT CET Percentile:</b> {payload.percentile:.2f}%", meta_cell_style)
        ],
        [
            Paragraph(f"<b>Category:</b> {payload.category}", meta_cell_style),
            Paragraph(f"<b>State Merit Rank:</b> {payload.merit_rank or 'Available in Final Merit'}", meta_cell_style),
            Paragraph(f"<b>Date Generated:</b> {datetime.datetime.now().strftime('%d-%m-%Y %H:%M')}", meta_cell_style)
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[200, 180, 176])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#94a3b8")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Preference Table
    choice_table_data = [
        ["Pref #", "Choice Code (9-Digit)", "Inst Code", "Institute Name", "Course / Branch Name", "Quota", "Cutoff (%)"]
    ]

    for c in payload.choices:
        inst_p = Paragraph(f"<b>{c.college_name[:36]}</b>", table_cell_style)
        branch_p = Paragraph(c.branch_name[:28], table_cell_style)
        code_p = Paragraph(f"<b>{c.choice_code}</b>", table_code_style)

        choice_table_data.append([
            str(c.preference_no),
            code_p,
            c.college_code,
            inst_p,
            branch_p,
            c.seat_type,
            f"{c.closing_percentile:.2f}%"
        ])

    col_widths = [36, 92, 50, 160, 128, 45, 45]
    choice_table = Table(choice_table_data, colWidths=col_widths, repeatRows=1)
    choice_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 7.5),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (1, 0), (2, -1), 'CENTER'),
        ('ALIGN', (-2, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    story.append(choice_table)
    story.append(Spacer(1, 10))

    # 4. Instructions
    inst_style = ParagraphStyle(
        'CapInst',
        parent=styles['Italic'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#475569")
    )
    notice = (
        "<b>Important Instructions for Option Form Filling:</b><br/>"
        "1. This preference list is ordered strategically based on verified historical CAP Round cutoffs.<br/>"
        "2. Rule of CAP Counseling: Fill ambitious choices at top, realistic targets in middle, and guaranteed safe backups at bottom.<br/>"
        "3. Copy the exact 9-digit choice codes shown above into the State CET Cell Option Form portal (cetcell.mahacet.org).<br/>"
        "4. Allotment is strictly based on inter-se merit, reservation policies, and candidate choice sequence."
    )
    story.append(Paragraph(notice, inst_style))

    doc.build(story)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=mhtcet_cap_option_form_{datetime.date.today()}.pdf"}
    )
