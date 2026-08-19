# Model X-Ray

**Defensive AI-Model Steganalysis Security Platform**  
*GE HealthCare Precision Care Challenge 2026*  
Based on Gilkarov & Dubin ([arXiv:2409.19310](https://arxiv.org/abs/2409.19310))

---

## Overview

**Model X-Ray** is an enterprise-grade AI model security inspection and steganalysis platform. It detects covert steganographic data, hidden payloads, and weight-tampering embedded inside neural network parameter files (`.safetensors`) before clinical deployment.

### Key Capabilities
- **Zero-Code-Execution Security Gate**: Strictly parses SafeTensors headers and tensors without executing any code. Rejects pickled formats (`.pt`/`.pth`) with clear security rationale.
- **Micro-Steganalysis & Moments Engine**: Computes LSB Shannon entropy, adjacent bit regularity, 32-bit frequency deviations, neighbor weight correlations, and per-layer statistical moments.
- **Grayscale-Fourpart Representation**: Deconstructs 32-bit floats into four 8-bit byte planes (Algorithm 3) and composites high-resolution 2×2 grayscale images.
- **Metric-Space Few-Shot Detector**: Extracts 128-d CNN embeddings and calculates centroid/1-NN distances against reference clean/suspicious galleries.
- **Zero-Hallucination Risk Engine**: Multi-factor 0–100 score traced to explicit mathematical formulas with configurable LOW / MEDIUM / HIGH / CRITICAL bands.
- **10-Stage Asynchronous Pipeline**: Real-time progress tracking across 10 sequential pipeline stages with automatic temporary file cleanup.
- **Forensic PDF & JSON Reporting**: Generates enterprise PDF reports with embedded Fourpart representations, finding tables, and healthcare deployment guidance.
- **Next.js 14 Security Console**: Sleek enterprise dark console featuring real-time stage monitoring, interactive byte-plane viewer, and KPI telemetry.

---

## Quickstart

### Option 1: Docker Compose (Recommended)

Run the entire integrated platform (FastAPI Backend + Next.js Frontend) with a single command:

```bash
docker compose up --build
```

- **Web Console**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

### Option 2: Local Development

#### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

#### 1. Setup Backend
```bash
# Create and activate virtualenv
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt fastapi "uvicorn[standard]" python-multipart reportlab pydantic-settings aiofiles httpx

# Run tests
pytest

# Start FastAPI server on port 8000
uvicorn model_xray.api.app:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Documentation & Curl Examples

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Service status, detector state, reference paper info. |
| `/api/models` | `GET` | Available demo models, scan history count, security policy. |
| `/api/stats` | `GET` | Aggregated dashboard KPI metrics and risk distribution. |
| `/api/scan` | `POST` | Upload `.safetensors` file and enqueue 10-stage scan. |
| `/api/scan/demo` | `POST` | Run 10-stage scan against bundled synthetic demo sample. |
| `/api/scan/{id}` | `GET` | Poll scan status, current pipeline stage, progress (0-100), results. |
| `/api/scan/{id}/report` | `GET` | Structured scan report JSON. |
| `/api/scan/{id}/report/pdf` | `GET` | Download signed forensic PDF report. |
| `/api/scan/{id}/report/json` | `GET` | Download full scan result JSON. |
| `/api/scan/{id}/artifacts` | `GET` | List generated artifacts (Fourpart PNG, PDF). |
| `/api/scan/{id}/artifacts/fourpart.png` | `GET` | Stream 2×2 Grayscale-Fourpart composite PNG image. |

### Example 1: Run Demo Scan on Clean Baseline
```bash
curl -s -X POST http://localhost:8000/api/scan/demo \
  -H "Content-Type: application/json" \
  -d '{"sample_id": "tiny_residual"}'
```

### Example 2: Poll Scan Progress
```bash
curl -s http://localhost:8000/api/scan/<SCAN_ID>
```

### Example 3: Download Forensic PDF Report
```bash
curl -s -O http://localhost:8000/api/scan/<SCAN_ID>/report/pdf
```

### Example 4: Upload Custom Model
```bash
curl -s -X POST http://localhost:8000/api/scan \
  -F "file=@path/to/model.safetensors"
```

---

## Project Layout

```
├── model_xray/
│   ├── analysis/          # Statistical moments & float32 bit-level steganalysis
│   ├── api/               # FastAPI application, routes, and CORS setup
│   ├── detector/          # Few-shot CNN embedding extractor & metric learning
│   ├── ingestion/         # SafeTensors parser & SHA-256 integrity hasher
│   ├── models/            # Pydantic schemas, pipeline stages, and models
│   ├── reporting/         # Explainability layer & ReportLab PDF generator
│   ├── representation/    # Grayscale-Fourpart 2x2 byte-plane PNG generator
│   ├── risk/              # Calibrated multi-factor risk scoring engine
│   ├── storage/           # SQLite database manager & scan repository
│   ├── synthetic/         # Synthetic clean/suspicious test data generator
│   ├── pipeline.py        # 10-stage asynchronous pipeline orchestrator
│   └── __main__.py        # CLI entrypoint
├── frontend/              # Next.js 14 TypeScript Tailwind security console
│   ├── src/
│   │   ├── app/           # Next.js App Router (page.tsx, layout.tsx, globals.css)
│   │   ├── components/    # Navbar, Dashboard, ScanStudio, StageTracker, Results
│   │   └── lib/           # TypeScript interfaces and API client
├── tests/                 # Unit & integration tests (20 tests passing)
├── scripts/               # Utility scripts
├── Dockerfile.backend     # Python backend container
├── Dockerfile.frontend    # Next.js frontend container
├── docker-compose.yml     # Multi-service deployment orchestration
├── ARCHITECTURE.md        # Detailed system design & pipeline specifications
├── THREAT_MODEL.md        # Healthcare AI steganography threat analysis
├── DEMO_GUIDE.md          # Evaluator & judge walkthrough script
└── MODEL_XRAY_RESEARCH_MAPPING.md # Research mapping to arXiv:2409.19310
```

---

## Research Citation & Limitations

- **Foundational Research**: Gilkarov, A., & Dubin, R. (2024). *Model X-Ray: Steganalysis for AI Models*. arXiv:2409.19310.
- **Scope & Limitations**: Operates exclusively on SafeTensors format for zero-code-execution safety. Few-shot metric detection utilizes a lightweight 4-layer CNN feature extractor approximating the full SRNet architecture.
- **Safety Notice**: All synthetic test artifacts generated by Model X-Ray are non-executable randomized bit perturbations and contain no malicious code or covert payload logic.
