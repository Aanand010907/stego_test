# Model X-Ray: Architecture & System Design

**Model X-Ray** is a defensive AI-model steganalysis and weight-integrity verification system designed for the **GE HealthCare Precision Care Challenge 2026**, grounded in the peer-reviewed research by Gilkarov & Dubin ([arXiv:2409.19310](https://arxiv.org/abs/2409.19310)).

---

## 1. High-Level System Architecture

```
                                  [ User / Clinician / Security Analyst ]
                                                     │
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │   Next.js 14 Web Frontend   │
                                      │   - Dark Console Aesthetic  │
                                      │   - Live Stage Tracker      │
                                      │   - Fourpart & Layer Viewer │
                                      │   - PDF / JSON Exporter     │
                                      └──────────────┬──────────────┘
                                                     │ HTTP REST / Polling
                                                     ▼
                                      ┌─────────────────────────────┐
                                      │     FastAPI Backend API     │
                                      │   - Zero-Pickle Security    │
                                      │   - Background Job Queue    │
                                      │   - SQLite WAL Persistence  │
                                      └──────────────┬──────────────┘
                                                     │
               ┌─────────────────────────────────────┴─────────────────────────────────────┐
               ▼                                     ▼                                     ▼
     ┌───────────────────┐                 ┌───────────────────┐                 ┌───────────────────┐
     │ 10-Stage Pipeline │                 │   Storage Engine  │                 │  Report Generator │
     │  Orchestrator     │                 │ - SQLite Schema   │                 │ - ReportLab PDF   │
     │                   │                 │ - Temp File Purge │                 │ - JSON Exporter   │
     │                   │                 │ - Artifacts Store │                 │                   │
     └─────────┬─────────┘                 └───────────────────┘                 └───────────────────┘
               │
   ┌───────────┴─────────────────────────────────────────────────────────────────────────────┐
   ▼                                                                                         ▼
[ 10-Stage Sequential Analysis Engine ]                                       [ Few-Shot Reference Zoo ]
 1. QUEUED                   → Job initialized and validated                   - Clean Baselines (MLP, Conv, Attn, Res)
 2. VALIDATION               → SafeTensors header & security bounds check      - Steganographic Variants (6.25%, 12.5%, 25% ER)
 3. HASHING                  → Cryptographic SHA-256 calculation
 4. METADATA_EXTRACTION      → Tensor counts, shape maps, dtype histogram
 5. STATISTICAL_ANALYSIS     → Per-layer moments (mean, std, skew, kurt, entropy)
 6. BIT_LEVEL_ANALYSIS       → Float32 LSB entropy, bit frequencies, regularity
 7. FOURPART_REPRESENTATION  → 2x2 Grayscale-Fourpart byte-plane composite PNG
 8. DETECTOR_INFERENCE       → CNN embedding extraction & centroid / 1-NN metric
 9. RISK_EVALUATION          → Calibrated formula tracing & explainable findings
 10. COMPLETED               → DB finalized, PDF cached, temp files purged
```

---

## 2. 10-Stage Pipeline Lifecycle

The analysis pipeline executes asynchronously with live stage updates tracked in SQLite:

| Stage # | Identifier | Purpose | Mathematical / Security Method |
|---|---|---|---|
| **1** | `QUEUED` | Job initialization | UUID generation, job registration in SQLite WAL database. |
| **2** | `VALIDATION` | Security gatekeeping | Rejects `.pt`/`.pth`/`.bin`/`.pkl` (arbitrary code execution prevention). Validates SafeTensors 8-byte length prefix and header JSON. |
| **3** | `HASHING` | Cryptographic integrity | Computes SHA-256 digest in 64KB chunks to establish chain-of-custody for audited model. |
| **4** | `METADATA_EXTRACTION` | Structural mapping | Extracts tensor names, shapes, parameter counts, and header metadata without executing any weights. |
| **5** | `STATISTICAL_ANALYSIS` | Moment estimation | Calculates Mean, Standard Deviation, Min/Max, Fisher Skewness, Excess Kurtosis, Shannon histogram entropy, zero ratio, and repeated-value ratios. |
| **6** | `BIT_LEVEL_ANALYSIS` | Micro-steganalysis | Views `float32` as `uint32` bitfields (`ndarray.view(np.uint32)`). Computes LSB Shannon entropy ($H_{LSB}$), bit frequencies ($b_0 \dots b_{31}$), mean deviation from 0.5, local adjacent regularity ($R_{local}$), and neighbor-weight Pearson correlation. |
| **7** | `FOURPART_REPRESENTATION` | Spatial transformation | Gilkarov & Dubin Algorithm 3: Deconstructs 32-bit floats into four 8-bit planes (Plane 0: Sign/Exp, Plane 1: High Mantissa, Plane 2: Mid Mantissa, Plane 3: Lowest LSB Mantissa). Pads to square and composites 2×2 grayscale PNG. |
| **8** | `DETECTOR_INFERENCE` | Metric-space scoring | Feeds 2×2 grayscale composite into a 4-layer CNN feature extractor with global average pooling producing a 128-dimensional embedding vector. Evaluates L2 distance to clean centroid vs. suspicious centroid and 1-NN gallery match. |
| **9** | `RISK_EVALUATION` | Formula-based verdict | Evaluates multi-term weighted risk score ($0–100$) using calibrated linear anchors. Maps score into LOW ($<25$), MEDIUM ($25–50$), HIGH ($50–75$), or CRITICAL ($>75$) bands. Generates structured explainability findings. |
| **10** | `COMPLETED` | Artifact generation & cleanup | Generates executive PDF report artifact, commits complete scan JSON to SQLite, and purges temporary uploaded file from disk. |

---

## 3. Risk Engine Formulation

Every risk score component in Model X-Ray is deterministic, bounded, and traces to a transparent mathematical equation with configurable thresholds:

$$Score = \sum_{i} w_i \cdot s_i(\text{observed}_i)$$

Where $\sum w_i = 1.0$, and each component score $s_i \in [0, 100]$:

1. **LSB Shannon Entropy ($w = 0.30$)**:
   $$s_{entropy} = 100 \cdot \text{clamp}\left(\frac{H_{LSB} - 0.20}{0.95 - 0.20}, 0, 1\right)$$
   *Rationale:* Clean model weights show low or structured LSB entropy; steganographic LSB substitution drives entropy towards $1.0$.

2. **Local Adjacent Regularity ($w = 0.25$)**:
   $$s_{reg} = 100 \cdot \text{clamp}\left(\frac{0.80 - R_{local}}{0.80 - 0.50}, 0, 1\right)$$
   *Rationale:* Neighboring clean float32 weights frequently share identical LSB states ($R_{local} \to 1.0$); random substitution creates noise where $P(\text{bit}_i == \text{bit}_{i+1}) \to 0.50$.

3. **LSB Ones Ratio ($w = 0.15$)**:
   $$s_{ones} = 100 \cdot \text{clamp}\left(\frac{\text{ones\_ratio} - 0.10}{0.50 - 0.10}, 0, 1\right)$$
   *Rationale:* Pruned/structured low-order mantissas are biased towards zero; stego embeddings produce an equiprobable $0.50$ balance.

4. **Neighbor LSB Pearson Correlation ($w = 0.10$)**:
   $$s_{corr} = 100 \cdot \text{clamp}\left(\frac{0.85 - |r_{neighbor}|}{0.85}, 0, 1\right)$$
   *Rationale:* Measures correlation across adjacent weights. Natural quantization produces high local correlation; stego perturbation destroys it.

5. **Few-Shot Embedding Centroid Distance Ratio ($w = 0.20$)**:
   $$\text{Affinity} = \frac{d(\mathbf{e}, \mathbf{c}_{clean})}{d(\mathbf{e}, \mathbf{c}_{clean}) + d(\mathbf{e}, \mathbf{c}_{suspicious})}$$
   $$s_{emb} = 100 \cdot \text{Affinity}$$
   *Rationale:* CNN metric space position relative to verified clean baseline gallery versus known steganographic perturbation gallery.

---

## 4. SQLite Storage Schema & Concurrency

The SQLite database (`data/model_xray.db`) operates in **WAL (Write-Ahead Logging)** mode with `NORMAL` synchronous settings for non-blocking concurrent reads during active background scans:

```sql
CREATE TABLE scans (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    sha256 TEXT,
    status TEXT NOT NULL,          -- 'PROCESSING', 'COMPLETED', 'FAILED'
    current_stage TEXT NOT NULL,   -- 'QUEUED', 'VALIDATION', ..., 'COMPLETED'
    progress INTEGER NOT NULL,     -- 0 to 100
    stages_json TEXT NOT NULL,     -- List of StageInfo (timings, messages)
    created_at TEXT NOT NULL,
    completed_at TEXT,
    duration_sec REAL,
    is_demo INTEGER NOT NULL,      -- 1 for synthetic demo, 0 for upload
    demo_sample_id TEXT,
    model_arch TEXT,
    risk_score REAL,
    risk_band TEXT,                -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    error_message TEXT,
    result_json TEXT,              -- Complete ModelScanResult JSON
    fourpart_png_path TEXT
);
```

---

## 5. Security & Isolation Boundaries

1. **Zero-Code-Execution (Anti-Deserialization Rationale)**:
   - Pickled PyTorch models (`.pt`/`.pth`) use Python's `pickle` module, which contains opcodes capable of executing arbitrary code (`GLOBAL`, `REDUCE`, `BUILD`) upon `torch.load()`.
   - Model X-Ray rejects all pickled formats and operates exclusively on **SafeTensors** (`safetensors>=0.4.0`), where headers are strictly validated JSON dictionaries and tensor data are contiguous raw byte slices mapped without execution.

2. **Temporary File Ephemeral Lifecycle**:
   - Uploaded files are streamed to `data/tmp_uploads/<scan_id>.safetensors`.
   - The file is processed sequentially across the 10 stages.
   - Upon stage completion or failure, the file is automatically purged from disk (`os.remove`), ensuring no residual user files remain on the host.
