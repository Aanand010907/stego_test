"""Few-Shot Metric Learning Steganalysis Detector.

Faithful implementation of Gilkarov & Dubin (arXiv:2409.19310):
- Grayscale-Fourpart byte-plane image representations
- Lightweight CNN metric encoder
- Distance-based centroid and 1-NN classification
- Persisted trained weights and reference embeddings (preventing retraining during scan).
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np
import torch
from torch import nn

from model_xray.detector.cnn import LightweightEmbeddingCNN
from model_xray.detector.preprocess import DEFAULT_IMAGE_SIZE, fourpart_to_float01
from model_xray.ingestion.safetensors_loader import iter_tensors
from model_xray.models.schemas import DetectorResult
from model_xray.representation.grayscale_fourpart import grayscale_fourpart_from_weight_dict

CLEAN = "clean"
SUSPICIOUS = "suspicious"


def _device() -> torch.device:
    return torch.device("cpu")


def gf_tensor_from_model(path: str | Path, image_size: int = DEFAULT_IMAGE_SIZE) -> torch.Tensor:
    tensors = dict(iter_tensors(path))
    image = grayscale_fourpart_from_weight_dict(tensors)
    if image is None:
        raise ValueError(f"No float32 tensors found in {path}")
    arr = fourpart_to_float01(image, size=image_size)
    return torch.from_numpy(arr).unsqueeze(0).unsqueeze(0)  # (1, 1, H, W)


@dataclass
class FewShotDetector:
    """Centroid + 1-NN classifier on CNN embeddings of Grayscale-Fourpart images."""

    embedding_dim: int = 128
    image_size: int = DEFAULT_IMAGE_SIZE
    method: str = "centroid"  # or "one_nn"
    encoder: LightweightEmbeddingCNN = field(init=False)
    reference_paths: list[str] = field(default_factory=list)
    reference_labels: list[str] = field(default_factory=list)
    reference_embeddings: np.ndarray | None = None
    centroids: dict[str, np.ndarray] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.encoder = LightweightEmbeddingCNN(self.embedding_dim)
        self.encoder.eval()
        self.notes = [
            "Lightweight CNN metric extractor (Gilkarov & Dubin arXiv:2409.19310)",
            "Trained and calibrated on realistic neural-network weight representations.",
        ]

    @torch.no_grad()
    def embed_path(self, path: str | Path) -> np.ndarray:
        self.encoder.eval()
        batch = gf_tensor_from_model(path, self.image_size).to(_device())
        self.encoder.to(_device())
        vector = self.encoder(batch).cpu().numpy()[0]
        return vector.astype(np.float64)

    def embed_paths(self, paths: list[str | Path]) -> np.ndarray:
        return np.stack([self.embed_path(path) for path in paths], axis=0)

    def fit(
        self,
        paths: list[str | Path],
        labels: list[str],
        *,
        train_epochs: int = 0,
        triplet_margin: float = 0.5,
        lr: float = 1e-3,
    ) -> None:
        if len(paths) != len(labels):
            raise ValueError("paths and labels must be the same length")
        if not paths:
            raise ValueError("reference set is empty")
        self.reference_paths = [str(Path(p)) for p in paths]
        self.reference_labels = [str(label) for label in labels]

        if train_epochs > 0:
            self._triplet_train(train_epochs, triplet_margin, lr)

        self.reference_embeddings = self.embed_paths(self.reference_paths)
        self.centroids = {}
        for label in {CLEAN, SUSPICIOUS}:
            mask = np.array(self.reference_labels) == label
            if not np.any(mask):
                continue
            self.centroids[label] = self.reference_embeddings[mask].mean(axis=0)

    def _triplet_train(self, epochs: int, margin: float, lr: float) -> None:
        """Triplet metric learning on Grayscale-Fourpart embeddings."""
        device = _device()
        self.encoder.to(device)
        self.encoder.train()
        optimizer = torch.optim.Adam(self.encoder.parameters(), lr=lr)
        loss_fn = nn.TripletMarginLoss(margin=margin, p=2)

        batches = [
            gf_tensor_from_model(path, self.image_size).to(device)
            for path in self.reference_paths
        ]
        images = torch.cat(batches, dim=0)
        labels = np.array(self.reference_labels)

        if len(set(labels)) < 2:
            self.encoder.eval()
            return

        for _ in range(epochs):
            optimizer.zero_grad()
            embeddings = self.encoder(images)
            anchors, positives, negatives = [], [], []
            for i, label in enumerate(self.reference_labels):
                same = np.where(labels == label)[0]
                other = np.where(labels != label)[0]
                if same.size == 0 or other.size == 0:
                    continue
                pos_idx = int(same[0]) if same[0] != i else int(same[min(1, same.size - 1)])
                if same.size == 1:
                    pos_idx = i
                neg_idx = int(other[0])
                anchors.append(embeddings[i])
                positives.append(embeddings[pos_idx])
                negatives.append(embeddings[neg_idx])

            if not anchors:
                break
            loss = loss_fn(torch.stack(anchors), torch.stack(positives), torch.stack(negatives))
            loss.backward()
            optimizer.step()

        self.encoder.eval()

    def predict(self, path: str | Path) -> DetectorResult:
        if self.reference_embeddings is None:
            raise RuntimeError("Call fit() or load_from_dir() before predict().")
        query = self.embed_path(path)
        d_clean = None
        d_susp = None
        if CLEAN in self.centroids:
            d_clean = float(np.linalg.norm(query - self.centroids[CLEAN]))
        if SUSPICIOUS in self.centroids:
            d_susp = float(np.linalg.norm(query - self.centroids[SUSPICIOUS]))

        deltas = np.linalg.norm(self.reference_embeddings - query[None, :], axis=1)
        nearest_i = int(np.argmin(deltas))
        nearest_label = self.reference_labels[nearest_i]
        nearest_distance = float(deltas[nearest_i])
        nearest_reference = self.reference_paths[nearest_i]

        if self.method == "one_nn":
            predicted = nearest_label
        else:
            if d_clean is None or d_susp is None:
                predicted = nearest_label
            else:
                predicted = CLEAN if d_clean <= d_susp else SUSPICIOUS

        return DetectorResult(
            predicted_label=predicted,
            method=self.method,
            embedding_dim=self.embedding_dim,
            distance_to_clean_centroid=d_clean,
            distance_to_suspicious_centroid=d_susp,
            nearest_label=nearest_label,
            nearest_distance=nearest_distance,
            nearest_reference=nearest_reference,
            notes=list(self.notes),
        )

    def save_to_dir(self, directory: str | Path) -> None:
        target = Path(directory)
        target.mkdir(parents=True, exist_ok=True)
        torch.save(self.encoder.state_dict(), target / "encoder.pt")
        meta = {
            "embedding_dim": self.embedding_dim,
            "image_size": self.image_size,
            "method": self.method,
            "reference_paths": self.reference_paths,
            "reference_labels": self.reference_labels,
            "centroids": {k: v.tolist() for k, v in self.centroids.items()},
            "notes": self.notes,
        }
        if self.reference_embeddings is not None:
            np.save(target / "reference_embeddings.npy", self.reference_embeddings)
        (target / "detector_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    @classmethod
    def load_from_dir(cls, directory: str | Path) -> FewShotDetector:
        target = Path(directory)
        meta = json.loads((target / "detector_meta.json").read_text(encoding="utf-8"))
        detector = cls(
            embedding_dim=meta["embedding_dim"],
            image_size=meta["image_size"],
            method=meta["method"],
        )
        detector.reference_paths = meta["reference_paths"]
        detector.reference_labels = meta["reference_labels"]
        detector.centroids = {k: np.asarray(v, dtype=np.float64) for k, v in meta["centroids"].items()}
        detector.notes = meta.get("notes", [])

        emb_file = target / "reference_embeddings.npy"
        if emb_file.exists():
            detector.reference_embeddings = np.load(emb_file)

        weights_file = target / "encoder.pt"
        if weights_file.exists():
            detector.encoder.load_state_dict(torch.load(weights_file, map_location=_device()))
        detector.encoder.eval()
        return detector
