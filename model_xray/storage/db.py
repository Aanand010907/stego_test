from __future__ import annotations

import os
import sqlite3
from pathlib import Path
from typing import Generator

DEFAULT_DB_PATH = os.getenv("MODEL_XRAY_DB_PATH", "data/model_xray.db")
_DB_INITIALIZED = False


def get_db_path() -> Path:
    db_path = Path(os.getenv("MODEL_XRAY_DB_PATH", DEFAULT_DB_PATH))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    return db_path


def init_db() -> None:
    global _DB_INITIALIZED
    path = get_db_path()
    conn = sqlite3.connect(str(path), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    file_size_bytes INTEGER NOT NULL,
                    sha256 TEXT,
                    status TEXT NOT NULL,
                    current_stage TEXT NOT NULL,
                    progress INTEGER NOT NULL DEFAULT 0,
                    stages_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    duration_sec REAL,
                    is_demo INTEGER NOT NULL DEFAULT 0,
                    demo_sample_id TEXT,
                    model_arch TEXT,
                    risk_score REAL,
                    risk_band TEXT,
                    error_message TEXT,
                    result_json TEXT,
                    fourpart_png_path TEXT
                );
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans (created_at DESC);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_scans_sha256 ON scans (sha256);
            """)
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_scans_status ON scans (status);
            """)
        _DB_INITIALIZED = True
    finally:
        conn.close()


def get_db_connection() -> sqlite3.Connection:
    global _DB_INITIALIZED
    path = get_db_path()
    if not _DB_INITIALIZED or not path.exists():
        init_db()

    conn = sqlite3.connect(str(path), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    return conn


def get_db() -> Generator[sqlite3.Connection, None, None]:
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()
