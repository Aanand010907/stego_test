# Model X-Ray: Threat Model & Security Analysis

**Target Domain:** Precision Healthcare & Clinical AI Deployment (Medical Imaging, EHR Analysis, Diagnostic Assistance)  
**Research Reference:** Gilkarov & Dubin ([arXiv:2409.19310](https://arxiv.org/abs/2409.19310))

---

## 1. Threat Profile: AI-Model Steganography in Clinical Systems

In modern precision healthcare pipelines, deep learning models are regularly downloaded from external repositories (e.g. HuggingFace, open-source model hubs, multi-institutional clinical consortia) and integrated into clinical workflows (e.g. DICOM/PACS image segmentation, pathology classification, radiotherapy planning).

### Threat Actors & Motives
1. **Malicious Model Suppliers / Compromised Supply Chains**: An adversary tampers with published model weights to covertly embed exfiltration payloads, C2 beaconing commands, or proprietary trade secrets.
2. **Insider Threats**: An employee or collaborator encodes sensitive patient data (Protected Health Information - PHI) or proprietary genomic records directly inside model parameter tensors before transferring the model outside the secure clinical enclave.
3. **Watermark / Steganography Obfuscation**: Attackers using neural weights as a covert channel that evades traditional DLP (Data Loss Prevention) scanners and network perimeter firewalls.

---

## 2. Attack Vectors & Technical Mechanisms

```
 32-Bit IEEE-754 Single-Precision Float Weight:
 ┌───┬─────────────────────────┬─────────────────────────────────────────────────┐
 │ S │ Exponent (8 bits)       │ Mantissa / Fraction (23 bits)                   │
 └───┴─────────────────────────┴───────────────────────┬─────────────────────────┤
  31  30                     23 22                    8 7                       0
                                                        ▲
                                                        └─ Attack Vector: LSBs
```

### Vector A: Least Significant Bit (LSB) Substitution
- **Mechanism**: The attacker replaces the lowest $k$ bits ($k \in [1, 8]$) of the 23-bit mantissa across weight tensors.
- **Stealth**: Because perturbations in bits $0 \dots 7$ alter the weight by less than $2^{-16} \approx 0.000015$, model accuracy on clinical benchmarks (e.g. AUC, sensitivity, specificity) typically drops by less than $0.05\%$, remaining completely undetectable to functional evaluation tests.
- **Capacity**: In an 80-million parameter model, replacing 4 LSBs per float32 yields:
  $$\text{Capacity} = 80 \times 10^6 \times 4 \text{ bits} = 320 \text{ Mbits} = 40 \text{ MB of hidden covert data}$$

### Vector B: Pickle / Deserialization Code Execution
- **Mechanism**: Attacker packages weights using PyTorch `.pt`/`.pth` format (which uses Python `pickle`).
- **Exploit**: A maliciously crafted pickle payload invokes `os.system()` or `subprocess.Popen()` immediately when `torch.load()` is executed on the hospital's inference server.
- **Impact**: Full Remote Code Execution (RCE), clinical network lateral movement, and PACS server compromise.

---

## 3. Defensive Countermeasures in Model X-Ray

Model X-Ray enforces multi-layered defense in depth:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            DEFENSE IN DEPTH MATRIX                           │
├─────────────────────────┬────────────────────────────────────────────────────┤
│ Attack Vector           │ Model X-Ray Countermeasure                         │
├─────────────────────────┼────────────────────────────────────────────────────┤
│ Pickle Remote Code Exec │ Mandatory SafeTensors Format Requirement           │
│ (CVE-2024-X Deserializ) │ Blocks .pt/.pth with clear security rejection      │
├─────────────────────────┼────────────────────────────────────────────────────┤
│ High-Rate LSB Stego     │ Float32 LSB Shannon Entropy ($H_{LSB} > 0.85$)     │
│ (12.5% - 25% ER)        │ Local Adjacent Bit Regularity ($R_{local} < 0.65$) │
├─────────────────────────┼────────────────────────────────────────────────────┤
│ Low-Rate Subtle Stego   │ Grayscale-Fourpart Plane 3 Spatial Decomposition   │
│ (6.25% ER / 2 LSBs)     │ CNN Metric Space Few-Shot Embedding Distance       │
├─────────────────────────┼────────────────────────────────────────────────────┤
│ Memory Tampering / Disk │ Ephemeral File Processing & Automatic Purge        │
│ Residuals               │ SHA-256 Digest Chain of Custody Validation         │
└─────────────────────────┴────────────────────────────────────────────────────┘
```

---

## 4. Detection Boundaries & Limitations

1. **Format Scope**: Model X-Ray analyzes standard IEEE-754 `float32` tensors in SafeTensors format. Models quantized to INT8, FP8, or 4-bit NF4 undergo statistical validation but have distinct bit-level dynamics.
2. **Heuristic vs. Metric Sensitivity**: At extremely low embedding rates ($< 2\%$ of bits across $< 5\%$ of layers), single-layer statistical anomalies may be masked by global weight variance, emphasizing the need for per-layer inspection provided in the Model X-Ray Layer Explorer.
3. **Defensive Synthetic Scope**: All bundled synthetic test artifacts in Model X-Ray are strictly non-executable bit perturbations and contain no malicious code or covert payloads.
