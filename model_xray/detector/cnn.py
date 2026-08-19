"""Lightweight CNN feature extractor for Grayscale-Fourpart images.

Faithful *idea* of Gilkarov & Dubin (arXiv:2409.19310): map GF images to an
embedding, then classify with centroid / 1-NN. This is not a reproduction of
their trained OSL CNN or SRNet.
"""

from __future__ import annotations

import torch
from torch import nn


class LightweightEmbeddingCNN(nn.Module):
    """Small conv encoder producing an L2-normalized embedding.

    Divergences from the paper (Section III-D / IV-B):
    - Not the Koch et al. OSL CNN (64-128-128-256, 4096-d FC) at 100×100.
    - Not SRNet at 256×256.
    - No full triplet training schedule (ES / ST / UB for up to 100 epochs).
    - Adaptive average pooling so tests can use smaller images.
    - Embeddings are L2-normalized; the paper compares raw CNN embeddings
      with Euclidean distance and does not require this normalization.
    """

    def __init__(self, embedding_dim: int = 128) -> None:
        super().__init__()
        self.embedding_dim = embedding_dim
        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=7, padding=3),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, kernel_size=5, padding=2),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 64, kernel_size=3, padding=1),
            nn.ReLU(inplace=True),
            nn.AdaptiveAvgPool2d((8, 8)),
        )
        self.fc = nn.Linear(64 * 8 * 8, embedding_dim)

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        # images: (N, 1, H, W) in [0, 1]
        hidden = self.features(images)
        embedding = self.fc(torch.flatten(hidden, 1))
        return nn.functional.normalize(embedding, p=2, dim=1)
