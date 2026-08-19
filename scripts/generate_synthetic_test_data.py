#!/usr/bin/env python3
"""Standalone generator for synthetic Model X-Ray security test artifacts.

Produces paired clean and suspicious .safetensors files. Suspicious files only
perturb mantissa LSBs with deterministic pseudorandom bits — no executable malware.
"""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from model_xray.synthetic.generate import (
    SYNTHETIC_NOTICE,
    generate_paired_stego_dataset,
    generate_realistic_reference_corpus,
)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=str,
        default=None,
        help="Optional input clean .safetensors checkpoint to build paired benchmark from.",
    )
    parser.add_argument(
        "--out-dir",
        default="testdata/synthetic",
        help="Output directory (default: testdata/synthetic)",
    )
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args(argv)

    if args.input:
        records = generate_paired_stego_dataset(args.input, args.out_dir, seed=args.seed)
    else:
        records = generate_realistic_reference_corpus(args.out_dir, seed=args.seed)

    print(SYNTHETIC_NOTICE)
    print(f"Wrote {len(records)} artifacts under {args.out_dir}")
    for record in records:
        print(
            f"  [{record.label:10}] {record.filename:35} "
            f"X={record.x_lsb} LSBs (ER={record.embedding_rate*100:.2f}%)"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
