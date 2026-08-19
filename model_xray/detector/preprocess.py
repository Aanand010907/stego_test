from __future__ import annotations

import numpy as np
from PIL import Image

DEFAULT_IMAGE_SIZE = 100  # Paper OSL CNN uses 100×100 after reshape.


def fourpart_to_float01(image: np.ndarray, size: int = DEFAULT_IMAGE_SIZE) -> np.ndarray:
    """Resize a Grayscale-Fourpart uint8 image to `size` and scale to [0, 1].

    The paper down/up-scales GF images then divides by 255. Nearest-neighbor
    is used here to avoid blurring LSB structure (the paper is not explicit
    about interpolation; this is a documented divergence).
    """
    pil = Image.fromarray(np.ascontiguousarray(image, dtype=np.uint8), mode="L")
    if pil.size != (size, size):
        pil = pil.resize((size, size), resample=Image.Resampling.NEAREST)
    return np.asarray(pil, dtype=np.float32) / 255.0
