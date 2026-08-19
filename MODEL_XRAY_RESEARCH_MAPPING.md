# Model X-Ray: Research Mapping & Implementation Concordance

This document maps the implementation of **Model X-Ray** against the foundational scientific paper:

> **Reference Paper:**  
> Gilkarov, A., & Dubin, R. (2024). *Model X-Ray: Steganalysis for AI Models*.  
> arXiv:2409.19310 \[[https://arxiv.org/abs/2409.19310](https://arxiv.org/abs/2409.19310)\]

---

## 1. Research Concordance Matrix

| Paper Component | Paper Description / Algorithm | Model X-Ray Implementation | Concordance Category | Notes / Engineering Adaptations |
|---|---|---|---|---|
| **Grayscale-Fourpart (GF) Representation** | Algorithm 3: Splits 32-bit floats into 4×8-bit planes, pads to square, arranges into 2×2 composite image. | `model_xray.representation.grayscale_fourpart` | **Faithful Paper Implementation** | Direct implementation of Algorithm 3 using NumPy byte slicing (`uint32 >> shift & 0xFF`), square padding, and Pillow PNG encoding. |
| **Float32 Bit-Level Extraction** | Section 3.1: IEEE-754 bit-plane representation for float32 weights. | `model_xray.analysis.bits` | **Faithful Paper Implementation** | Direct `view(np.uint32)` IEEE-754 mantissa/exponent extraction, cross-checked with standard Python `struct.pack(">f")`. |
| **LSB Shannon Entropy ($H_{LSB}$)** | Section 3.2: Shannon entropy of the least-significant bit plane. | `model_xray.analysis.bits.binary_entropy` | **Faithful Paper Implementation** | $H(p) = -p \log_2(p) - (1-p) \log_2(1-p)$ calculated per tensor and concatenated model weights. |
| **Local Adjacent Bit Regularity ($R_{local}$)** | Section 3.2: Adjacent LSB equality rate $P(\text{LSB}_i = \text{LSB}_{i+1})$. | `model_xray.analysis.bits.local_regularity` | **Faithful Paper Implementation** | Exact calculation: `np.mean(bits[:-1] == bits[1:])`. Identifies noise vs. structured mantissa. |
| **Statistical Moments** | Section 3.1: Empirical distribution of weight values. | `model_xray.analysis.stats` | **Faithful Paper Implementation** | NumPy/SciPy computation of Mean, Std, Fisher Skewness, Excess Kurtosis, Zero Ratio, Repeated Ratio, and Histogram Entropy. |
| **Few-Shot Metric Learning (OSL CNN / SRNet)** | Section 4: Deep metric learning using SRNet / OSL CNN trained with Adam + triplet loss over Grayscale-Fourpart images. | `model_xray.detector.cnn` & `few_shot` | **Lightweight Practical Approximation** | Implements a lightweight 4-layer CNN feature extractor with global average pooling (128-d embeddings), supporting centroid distance and 1-NN classification against reference zoo. Full SRNet training deferred for resource efficiency. |
| **Embedding Rates (ER)** | Section 5: Experimental evaluation at $X/32$ ER (e.g. 6.25%, 12.5%, 25%). | `model_xray.synthetic.generate` | **Faithful Paper Implementation** | Standalone synthetic generator producing clean models and suspicious variants with 2, 4, and 8 randomized mantissa bits ($ER \in \{0.0625, 0.125, 0.25\}$). |

---

## 2. Extensions Beyond the Paper

Model X-Ray adds critical enterprise and security capabilities tailored for the **GE HealthCare Precision Care Challenge 2026**:

1. **Deterministic Calibrated Risk Engine (`model_xray.risk.scoring`)**:
   - Synthesizes statistical, bit-level, and metric-space evidence into a bounded $0–100$ score.
   - Every risk term traces to an explicit mathematical formula and measured physical quantity—eliminating opaque black-box outputs.

2. **Zero-Code-Execution SafeTensors Security Gate (`model_xray.ingestion` & `model_xray.api`)**:
   - Defensively rejects pickled weight files (`.pt`/`.pth`) to eliminate arbitrary code execution vulnerabilities during clinical deployment.

3. **10-Stage Asynchronous Execution Pipeline (`model_xray.pipeline`)**:
   - Full lifecycle orchestration with step-by-step progress tracking, millisecond timing, and automatic temporary file purging.

4. **Clinical Governance PDF & JSON Report Generator (`model_xray.reporting`)**:
   - Generates signed forensic PDF reports using ReportLab with embedded Grayscale-Fourpart visualizations, finding tables, and precision healthcare deployment recommendations.

5. **Enterprise Security Web Console (`frontend/`)**:
   - Modern dark-mode Next.js console with live pipeline stage animation, interactive byte-plane viewer, and KPI telemetry.
