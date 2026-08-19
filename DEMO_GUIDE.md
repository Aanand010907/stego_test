# Model X-Ray: Evaluator & Demo Guide

This guide provides a step-by-step walkthrough to demonstrate the defensive steganalysis capabilities of **Model X-Ray** using both the **Next.js Web Console** and the **FastAPI REST API**.

---

## 1. Quickstart: Launching the Application

### Option A: Local Development (FastAPI + Next.js)

1. **Start the Backend API Server**:
   ```bash
   source .venv/bin/activate
   uvicorn model_xray.api.app:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Verify healthcheck:* `curl http://localhost:8000/api/health`

2. **Start the Frontend Web Console** (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   *Open in browser:* [http://localhost:3000](http://localhost:3000)

### Option B: Unified Docker Compose

```bash
docker compose up --build
```
- Web Console: `http://localhost:3000`
- API Documentation / OpenAPI: `http://localhost:8000/docs`

---

## 2. Interactive Walkthrough Script

### Scenario 1: Auditing a Clean Baseline Model (`tiny_mlp` / `tiny_residual`)

1. Navigate to the **Scan Studio** tab in the web console.
2. In the **Interactive Demo Gallery**, locate **"Tiny Residual - CLEAN"** (or `tiny_mlp`).
3. Click **"Run 10-Stage Scan"**.
4. **Observe the Live 10-Stage Pipeline**:
   - Stages 1 to 10 execute sequentially with live progress updates and step durations.
   - Stage 6 (`BIT_LEVEL_ANALYSIS`): Measures LSB entropy $H_{LSB} \approx 0.000$ (structured zero/low mantissa bits) and local regularity $R_{local} \approx 1.000$.
   - Stage 8 (`DETECTOR_INFERENCE`): CNN embedding aligns with the clean centroid in metric space.
5. **Review the Inspection Verdict**:
   - **Risk Score**: `0.0 / 100` (Band: **`LOW RISK // VERIFIED CLEAN`**).
   - **Grayscale-Fourpart Viewer**: Plane 3 (Bottom-Right) displays structured, clean patterns without random salt-and-pepper noise.
   - **Findings Table**: All indicators fall within verified reference ranges.
6. Click **"Export PDF Report"** to download the signed forensic report.

---

### Scenario 2: Detecting High-Rate LSB Steganography (`tiny_mlp_x8` - 25% Embedding Rate)

1. In the **Scan Studio**, select **"Tiny Mlp - SUSPICIOUS (8 LSBs / 25.0%)"**.
2. Click **"Run 10-Stage Scan"**.
3. **Observe the Pipeline Execution**:
   - Stage 6 detects that the 8 lowest mantissa bits behave like true random noise.
   - Stage 8 detects high distance from the clean cluster and affinity to the stego cluster.
4. **Review the Verdict**:
   - **Risk Score**: `> 75.0 / 100` (Band: **`CRITICAL RISK // STEGO DETECTED`**).
   - **Grayscale-Fourpart Viewer**: Plane 3 (Bottom-Right) shows visible high-frequency uniform noise.
   - **Mathematical Risk Breakdown**:
     - `lsb_entropy`: $1.000$ (Weight: 30%, Contribution: $+30.00$).
     - `local_regularity`: $0.500$ (Weight: 25%, Contribution: $+25.00$).
     - `embedding_affinity`: High distance ratio towards suspicious centroid.
   - **Clinical Recommendation**: *"Critical steganographic anomalies detected. Quarantine model immediately."*

---

### Scenario 3: Detecting Moderate / Subtle Steganography (`tiny_conv_x2` - 6.25% Embedding Rate)

1. Select **"Tiny Conv - SUSPICIOUS (2 LSBs / 6.25%)"**.
2. Run the audit.
3. Observe how the multi-factor risk engine detects subtle perturbations even at 2 LSBs per float32, outputting a **MEDIUM** or **HIGH** risk score based on bit-frequency deviation and local regularity drop.

---

### Scenario 4: Verifying the Anti-Pickle Security Gate

1. Switch to the **"Upload Custom Model"** tab in Scan Studio.
2. Attempt to upload a `.pt` or `.pth` file.
3. **Observe the Immediate Security Rejection**:
   - The UI blocks the upload and displays the security warning explaining the deserialization exploit risk of Python `pickle` files.

---

## 3. CLI & REST API Curl Examples

### Health Check
```bash
curl -s http://localhost:8000/api/health | jq
```

### List Demo Models & Security Policy
```bash
curl -s http://localhost:8000/api/models | jq
```

### Trigger a Demo Scan via API
```bash
curl -s -X POST http://localhost:8000/api/scan/demo \
  -H "Content-Type: application/json" \
  -d '{"sample_id": "tiny_residual"}' | jq
```

### Poll Scan Status
```bash
curl -s http://localhost:8000/api/scan/<SCAN_ID> | jq
```

### Download PDF Report via API
```bash
curl -s -O http://localhost:8000/api/scan/<SCAN_ID>/report/pdf
```

### Upload and Audit a Custom `.safetensors` Model
```bash
curl -s -X POST http://localhost:8000/api/scan \
  -F "file=@path/to/my_model.safetensors" | jq
```
