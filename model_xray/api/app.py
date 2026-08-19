from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model_xray.api.routes import router
from model_xray.pipeline import get_default_detector, get_or_create_synthetic_gallery
from model_xray.storage.db import init_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("model_xray")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Initializing Model X-Ray SQLite Storage...")
    init_db()
    logger.info("Initializing Synthetic Reference Gallery & Detector...")
    try:
        get_or_create_synthetic_gallery()
        get_default_detector()
        logger.info("Model X-Ray backend ready.")
    except Exception as e:
        logger.error(f"Initialization error: {e}")
    yield
    logger.info("Shutting down Model X-Ray backend.")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Model X-Ray API",
        description=(
            "Defensive AI-Model Steganalysis Core for GE HealthCare Precision Care Challenge 2026. "
            "Detects steganographic weight perturbations and hidden payloads in SafeTensors neural networks."
        ),
        version="1.0.0",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled server error at {request.url.path}: {exc}")
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": str(exc),
                "path": request.url.path,
            },
        )

    return app


app = create_app()
