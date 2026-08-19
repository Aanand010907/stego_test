from __future__ import annotations

from pathlib import Path

from model_xray.ingestion.hashing import sha256_bytes, sha256_file


def test_sha256_bytes_known_vector() -> None:
    # FIPS-180 empty string and "abc" test vectors
    assert sha256_bytes(b"") == (
        "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    assert sha256_bytes(b"abc") == (
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )


def test_sha256_file_matches_bytes(tmp_path: Path) -> None:
    payload = b"model-xray-hash-fixture\n"
    path = tmp_path / "weights.bin"
    path.write_bytes(payload)
    assert sha256_file(path) == sha256_bytes(payload)
