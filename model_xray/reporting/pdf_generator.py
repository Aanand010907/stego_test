from __future__ import annotations

import io
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from model_xray.models.schemas import ModelScanResult, ScanJob


def _get_band_colors(band: str) -> tuple[colors.Color, colors.Color]:
    """Return (background_color, text_color) for risk band."""
    if band == "LOW":
        return colors.HexColor("#064E3B"), colors.HexColor("#A7F3D0")  # Dark emerald & mint
    elif band == "MEDIUM":
        return colors.HexColor("#78350F"), colors.HexColor("#FDE68A")  # Dark amber & yellow
    elif band == "HIGH":
        return colors.HexColor("#7C2D12"), colors.HexColor("#FFEDD5")  # Dark orange & peach
    elif band == "CRITICAL":
        return colors.HexColor("#7F1D1D"), colors.HexColor("#FECACA")  # Dark red & rose
    return colors.HexColor("#1F2937"), colors.HexColor("#F3F4F6")


def build_pdf_report(
    scan: ScanJob,
    result: ModelScanResult,
    fourpart_png_path: str | Path | None = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#0F172A")
    accent_blue = colors.HexColor("#2563EB")
    dark_gray = colors.HexColor("#334155")
    light_bg = colors.HexColor("#F8FAFC")
    border_color = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#64748B"),
        spaceAfter=12,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        spaceBefore=10,
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11.5,
        textColor=dark_gray,
    )
    bold_body = ParagraphStyle(
        "BoldBody",
        parent=body_style,
        fontName="Helvetica-Bold",
    )
    code_style = ParagraphStyle(
        "CodeStyle",
        parent=body_style,
        fontName="Courier",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0F172A"),
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=body_style,
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1E293B"),
    )

    story = []

    # Header / Title block
    story.append(Paragraph("MODEL X-RAY // STEGANALYSIS SECURITY REPORT", title_style))
    story.append(
        Paragraph(
            "Precision Care AI Security Audit & Defensive Model Verification Engine • "
            "Based on Gilkarov & Dubin (arXiv:2409.19310)",
            subtitle_style,
        )
    )
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceAfter=12))

    # Executive Summary & Risk Verdict Block
    risk_score = result.risk.score if result.risk else 0.0
    risk_band = result.risk.band if result.risk else "LOW"
    bg_band, text_band = _get_band_colors(risk_band)

    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=14,
        leading=16,
        alignment=1,  # Centered
        textColor=text_band,
    )
    score_style = ParagraphStyle(
        "ScoreText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=26,
        alignment=1,
        textColor=text_band,
    )

    badge_cell = [
        Paragraph(f"RISK BAND: {risk_band}", badge_style),
        Spacer(1, 4),
        Paragraph(f"{risk_score:.1f} / 100", score_style),
    ]

    exec_summary_text = (
        f"<b>Scan Target:</b> {scan.filename}<br/>"
        f"<b>Scan ID:</b> {scan.id}<br/>"
        f"<b>Timestamp:</b> {scan.created_at} UTC<br/>"
        f"<b>Architecture:</b> {scan.model_arch or 'SafeTensors Weights'}<br/>"
        f"<b>Evaluation Summary:</b> Model evaluated across 10 pipeline stages comprising "
        f"layer-by-layer bit-level steganography analysis (LSB entropy, regularity), "
        f"Grayscale-Fourpart byte-plane extraction, and CNN metric space few-shot classification."
    )

    exec_table = Table(
        [
            [
                Paragraph(exec_summary_text, body_style),
                badge_cell,
            ]
        ],
        colWidths=[380, 160],
    )
    exec_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), light_bg),
                ("BACKGROUND", (1, 0), (1, 0), bg_band),
                ("BOX", (0, 0), (-1, -1), 1, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 1, border_color),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(exec_table)
    story.append(Spacer(1, 10))

    # Model Identification Metadata Table
    story.append(Paragraph("1. Target Model Identification & Integrity", section_heading))
    meta = result.metadata
    meta_data = [
        [
            Paragraph("Filename", table_header_style),
            Paragraph(scan.filename, body_style),
            Paragraph("File Size", table_header_style),
            Paragraph(f"{meta.file_size_bytes:,} bytes", body_style),
        ],
        [
            Paragraph("SHA-256", table_header_style),
            Paragraph(meta.sha256, code_style),
            Paragraph("Tensor Count", table_header_style),
            Paragraph(str(meta.tensor_count), body_style),
        ],
        [
            Paragraph("Parameters", table_header_style),
            Paragraph(f"{meta.parameter_count:,}", body_style),
            Paragraph("Dtype Distribution", table_header_style),
            Paragraph(", ".join(f"{k}: {v}" for k, v in meta.tensor_dtype_counts.items()), body_style),
        ],
    ]
    meta_table = Table(meta_data, colWidths=[90, 210, 100, 140])
    meta_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), light_bg),
                ("BACKGROUND", (2, 0), (2, -1), light_bg),
                ("BOX", (0, 0), (-1, -1), 0.75, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Mathematical Risk Score Breakdown Table
    story.append(Paragraph("2. Mathematical Risk Component Breakdown", section_heading))
    risk_headers = [
        Paragraph("Risk Metric / Component", table_header_style),
        Paragraph("Observed Value", table_header_style),
        Paragraph("Clean Reference", table_header_style),
        Paragraph("Weight", table_header_style),
        Paragraph("Formula / Score", table_header_style),
        Paragraph("Contribution", table_header_style),
    ]
    risk_rows = [risk_headers]
    if result.risk:
        for c in result.risk.components:
            ref_str = (
                f"[{c.reference_range[0]:.2f}, {c.reference_range[1]:.2f}]"
                if c.reference_range
                else "N/A"
            )
            val_str = f"{c.measured_value:.4f} {c.measured_unit}" if c.measured_value is not None else "N/A"
            risk_rows.append(
                [
                    Paragraph(c.name, bold_body),
                    Paragraph(val_str, body_style),
                    Paragraph(ref_str, body_style),
                    Paragraph(f"{c.weight * 100:.1f}%", body_style),
                    Paragraph(c.formula, code_style),
                    Paragraph(f"{c.weighted_contribution:.2f}", bold_body),
                ]
            )
    risk_table = Table(risk_rows, colWidths=[110, 85, 75, 45, 175, 50])
    risk_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.75, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(risk_table)
    story.append(Spacer(1, 10))

    # Steganalysis Findings Table
    story.append(Paragraph("3. Steganalysis Findings & Interpretations", section_heading))
    findings_headers = [
        Paragraph("Scope", table_header_style),
        Paragraph("Indicator", table_header_style),
        Paragraph("Observed", table_header_style),
        Paragraph("Interpretation & Action Guidance", table_header_style),
    ]
    findings_rows = [findings_headers]
    if result.risk and result.risk.findings:
        for f in result.risk.findings:
            obs = f"{f.observed_value:.4f}" if f.observed_value is not None else "N/A"
            interp_text = f"<b>Interpretation:</b> {f.interpretation}<br/><b>Action:</b> {f.recommended_action}"
            findings_rows.append(
                [
                    Paragraph(f.scope, bold_body),
                    Paragraph(f.indicator, code_style),
                    Paragraph(obs, body_style),
                    Paragraph(interp_text, body_style),
                ]
            )
    findings_table = Table(findings_rows, colWidths=[110, 110, 60, 260])
    findings_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2E8F0")),
                ("BOX", (0, 0), (-1, -1), 0.75, border_color),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, border_color),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(findings_table)
    story.append(Spacer(1, 10))

    # Grayscale-Fourpart Composite Section
    story.append(Paragraph("4. Grayscale-Fourpart Weight Plane Representation", section_heading))
    fourpart_desc = (
        "Each 32-bit float weight is decomposed into four 8-bit bytes (Planes 0 to 3), "
        "arranged into a 2×2 composite (Top-Left: Plane 0/Sign+Exponent, Top-Right: Plane 1/Upper Mantissa, "
        "Bottom-Left: Plane 2/Mid Mantissa, Bottom-Right: Plane 3/Lowest LSB Mantissa). "
        "Natural clean models exhibit high structural coherence in Plane 3; LSB steganography introduces "
        "uncorrelated high-frequency noise."
    )
    story.append(Paragraph(fourpart_desc, body_style))
    story.append(Spacer(1, 6))

    img_path = fourpart_png_path or result.grayscale_fourpart_path
    if img_path and Path(img_path).exists():
        try:
            story.append(
                KeepTogether(
                    [
                        Image(str(img_path), width=2.5 * inch, height=2.5 * inch),
                        Spacer(1, 4),
                        Paragraph(
                            "<i>Figure 1: Generated Grayscale-Fourpart 2×2 composite representation.</i>",
                            ParagraphStyle("FigCap", parent=body_style, fontSize=7.5, textColor=colors.HexColor("#64748B")),
                        ),
                    ]
                )
            )
        except Exception:
            story.append(Paragraph("[Grayscale-Fourpart Image not renderable in PDF]", code_style))

    story.append(Spacer(1, 10))

    # Precision Healthcare Recommendations & Citations
    story.append(Paragraph("5. Clinical AI Governance & Research Context", section_heading))
    health_guidance = (
        "<b>Healthcare AI Security Policy:</b> Models deployed in clinical diagnostic pathways (e.g. PACS, "
        "EHR inference, radiation oncology planning) must undergo verifiable integrity audits. "
        "Any model flagged with HIGH or CRITICAL risk must be isolated from production deployment pipelines "
        "pending secondary forensic inspection.<br/><br/>"
        "<b>Research Citation:</b> Gilkarov, A., & Dubin, R. (2024). <i>Model X-Ray: Steganalysis for AI Models</i>. "
        "arXiv:2409.19310.<br/>"
        "<b>Limitations & Scope:</b> This scan analyzes SafeTensors weight tensors via float32 bit-level statistics "
        "and metric-space CNN embeddings. Serialized executable weights (pickle/.pt) are strictly rejected for safety."
    )
    story.append(Paragraph(health_guidance, body_style))

    doc.build(story)
    return buffer.getvalue()
