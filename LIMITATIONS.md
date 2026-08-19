# Model X-Ray: Known Limitations & Operational Scope

This document details the architectural boundaries, security assumptions, and known limitations of **Model X-Ray**.

---

## 1. Supported Model Formats & Scope
- **SafeTensors Exclusivity**: Model X-Ray operates strictly on standard SafeTensors (`.safetensors`) weight files. It explicitly rejects pickled formats (`.pt`, `.pth`, `.bin`, `.pkl`) to maintain a zero-code-execution security boundary.
- **Float32 Steganalysis Focus**: The micro-steganalysis algorithms (LSB entropy, adjacent bit regularity, bit-plane frequency deviations, and 4-part byte decomposition) are mathematically formulated for standard IEEE-754 `float32` tensors. Integer-quantized (INT8/INT4) or NF4 weights undergo structural and metadata analysis, but floating-point bitwise mantissa metrics are restricted to float32 tensors.

## 2. Few-Shot Detector Approximation
- **CNN Architecture**: In accordance with the project specification, Model X-Ray implements a lightweight 4-layer CNN feature extractor with global average pooling producing 128-dimensional metric embeddings (supporting Centroid Distance and 1-Nearest-Neighbor classification against a calibrated reference gallery). This provides a faithful, lightweight approximation of the full OSL CNN / SRNet architecture described in Gilkarov & Dubin (arXiv:2409.19310) without requiring multi-day distributed GPU metric-learning training.
- **Reference Zoo**: The few-shot gallery is trained on clean structural weight distributions and controlled synthetic LSB-substituted variants (6.25%, 12.5%, and 25% embedding rates).

## 3. Embedding Rate Sensitivity
- **Micro-Steganalysis Sensitivity**: LSB substitution rates $\ge 6.25\%$ (2 or more LSBs per float32 across layers) produce strong statistical anomalies ($H_{LSB} \to 1.0, R_{local} \to 0.5$) easily detected by the global and layer-level risk engines.
- **Sub-1% Ultra-Sparse Embedding**: If an adversary replaces only a single LSB in less than $0.5\%$ of model weights, global statistical moments may dilute the signal. Analysts should inspect layer-by-layer metrics via the Layer Explorer in the Inspection Report for isolated single-tensor anomalies.

## 4. Hardware & Deployment Considerations
- **PyTorch CPU Execution**: Detector feature extraction is optimized for CPU inference. GPU acceleration (`cuda`) is supported if available, but not required for standard evaluation.
- **Temporary Upload Lifecycle**: Uploaded model files are stored temporarily during the 10-stage scan and purged from the filesystem immediately upon scan completion or failure.
