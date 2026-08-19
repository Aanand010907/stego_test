from __future__ import annotations

import numpy as np

from model_xray.analysis.bits import compute_bit_metrics
from model_xray.analysis.stats import compute_statistics
from model_xray.ingestion.safetensors_loader import extract_metadata, iter_tensors
from model_xray.models.schemas import LayerAnalysis, ModelScanResult
from model_xray.representation.grayscale_fourpart import (
    grayscale_fourpart_from_weight_dict,
    save_grayscale_png,
)
from model_xray.risk.config import RiskConfig
from model_xray.risk.scoring import score_risk


def analyze_layers(tensors: dict[str, np.ndarray]) -> list[LayerAnalysis]:
    layers: list[LayerAnalysis] = []
    for name, array in tensors.items():
        dtype_name = np.dtype(array.dtype).name
        notes: list[str] = []
        stats = compute_statistics(array)
        bits = None
        if dtype_name == "float32":
            bits = compute_bit_metrics(array)
        else:
            notes.append("bit-level analysis applies to float32 tensors only")
        layers.append(
            LayerAnalysis(
                name=name,
                dtype=dtype_name,
                shape=[int(d) for d in array.shape],
                parameter_count=int(array.size),
                statistics=stats,
                bit_level=bits,
                notes=notes,
            )
        )
    return layers


def analyze_model(
    path: str,
    *,
    png_path: str | None = None,
    max_png_side: int | None = 1024,
    detector=None,
    risk_config: RiskConfig | None = None,
) -> ModelScanResult:
    metadata = extract_metadata(path)
    tensors = dict(iter_tensors(path))
    layers = analyze_layers(tensors)
    image = grayscale_fourpart_from_weight_dict(tensors)
    saved = None
    shape = None
    if image is not None:
        shape = [int(d) for d in image.shape]
        if png_path is not None:
            saved = str(save_grayscale_png(image, png_path, max_side=max_png_side))
    detector_result = None
    if detector is not None:
        detector_result = detector.predict(path)
    risk = score_risk(
        tensors=tensors,
        layers=layers,
        detector=detector_result,
        config=risk_config,
    )
    return ModelScanResult(
        metadata=metadata,
        layers=layers,
        grayscale_fourpart_path=saved,
        grayscale_fourpart_shape=shape,
        detector=detector_result,
        risk=risk,
        deferred={
            "api": "FastAPI routes are deferred",
            "frontend": "No UI in this phase",
            "pt_pth": "Pickle weight formats deferred (code-execution risk)",
            "paper_osl_srnet": "Full OSL CNN / SRNet training is not included",
        },
    )
