from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image
from safetensors.numpy import save_file

from model_xray.pipeline import analyze_safetensors
from model_xray.representation.grayscale_fourpart import grayscale_fourpart


def test_fourpart_composite_layout() -> None:
    values = np.array([1.0], dtype=np.float32)
    image = grayscale_fourpart(values)
    assert image.shape == (2, 2)
    assert image.dtype == np.uint8
    # 1.0 = 0x3F800000 → [[0x3F, 0x80], [0x00, 0x00]]
    assert image[0, 0] == 0x3F
    assert image[0, 1] == 0x80
    assert image[1, 0] == 0
    assert image[1, 1] == 0


def test_pipeline_writes_png_and_json(tmp_path: Path) -> None:
    model = tmp_path / "toy.safetensors"
    save_file(
        {"w": np.linspace(-1.0, 1.0, 16, dtype=np.float32).reshape(4, 4)},
        str(model),
    )
    out = tmp_path / "out"
    result = analyze_safetensors(model, out_dir=out, max_png_side=None)
    png = out / "toy_fourpart.png"
    assert png.is_file()
    assert result.grayscale_fourpart_path == str(png)
    with Image.open(png) as im:
        assert im.mode == "L"
        arr = np.array(im)
        assert arr.ndim == 2
        assert arr.shape[0] == arr.shape[1]
    assert (out / "toy_scan.json").is_file()
    assert result.layers[0].bit_level is not None
    assert result.layers[0].statistics is not None
