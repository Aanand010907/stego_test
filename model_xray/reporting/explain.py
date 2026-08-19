from __future__ import annotations

from model_xray.models.schemas import Finding


def action_for_band(band: str) -> str:
    return {
        "LOW": "No strong steganalysis indicators. Keep routine logging; no quarantine.",
        "MEDIUM": "Review the Grayscale-Fourpart LSB quadrant and bit-level metrics before promoting the weights.",
        "HIGH": "Quarantine from production. Have an analyst inspect layer LSB entropy and the few-shot distances.",
        "CRITICAL": "Do not deploy. Retain the SafeTensors file and scan JSON for investigation.",
    }[band]


def finding(
    *,
    indicator: str,
    scope: str,
    observed_value: float | None,
    reference_range: list[float] | None,
    interpretation: str,
    band: str,
    related_component: str | None,
) -> Finding:
    return Finding(
        indicator=indicator,
        scope=scope,
        observed_value=observed_value,
        reference_range=reference_range,
        interpretation=interpretation,
        recommended_action=action_for_band(band),
        related_component=related_component,
    )
