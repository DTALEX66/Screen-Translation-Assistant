from __future__ import annotations

import os
import time
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="ScreenLingua OCR Sidecar", version="0.3-mock")

MOCK_WORDS = [
    {"text": "Render Settings", "bbox": [420, 180, 570, 212], "confidence": 0.96, "language": "en"},
    {"text": "Subdivision Surface", "bbox": [440, 260, 620, 292], "confidence": 0.94, "language": "en"},
    {"text": "Permission Denied", "bbox": [380, 330, 548, 362], "confidence": 0.97, "language": "en"},
    {"text": "Prompt Engineering", "bbox": [360, 410, 560, 442], "confidence": 0.95, "language": "en"},
]


class OcrRequest(BaseModel):
    image_path: Optional[str] = None
    mode: str = "mock"
    language_hint: Optional[str] = "en"


class OcrBlock(BaseModel):
    id: Optional[str] = None
    text: str
    bbox: List[int]
    confidence: float
    language: Optional[str] = "en"


class OcrResponse(BaseModel):
    ok: bool
    provider: str
    elapsed_ms: int
    blocks: List[OcrBlock]
    error: Optional[str] = None


@app.get("/health")
def health():
    return {
        "ok": True,
        "provider": os.getenv("SCREENLINGUA_OCR_PROVIDER", "mock"),
        "version": "0.3-mock",
    }


@app.post("/ocr", response_model=OcrResponse)
def ocr(req: OcrRequest):
    start = time.time()
    provider = os.getenv("SCREENLINGUA_OCR_PROVIDER", req.mode or "mock")

    if provider == "mock":
        time.sleep(0.15)
        blocks = []
        for item in MOCK_WORDS:
            block = dict(item)
            block["id"] = f"mock-{uuid.uuid4().hex[:8]}"
            blocks.append(OcrBlock(**block))
        return OcrResponse(
            ok=True,
            provider="mock",
            elapsed_ms=int((time.time() - start) * 1000),
            blocks=blocks,
        )

    if not req.image_path:
        raise HTTPException(status_code=400, detail="image_path is required for real OCR provider")

    image = Path(req.image_path)
    if not image.exists():
        raise HTTPException(status_code=404, detail="image_path not found")

    if provider == "paddle":
        # TODO for CODEX:
        # from paddleocr import PaddleOCR
        # ocr = PaddleOCR(use_angle_cls=True, lang=req.language_hint or 'en')
        # raw = ocr.ocr(str(image), cls=True)
        # blocks = normalize_paddle_result(raw)
        return OcrResponse(
            ok=False,
            provider="paddle",
            elapsed_ms=int((time.time() - start) * 1000),
            blocks=[],
            error="PaddleOCR provider placeholder. Implement after mock loop is stable.",
        )

    return OcrResponse(
        ok=False,
        provider=provider,
        elapsed_ms=int((time.time() - start) * 1000),
        blocks=[],
        error=f"Unknown OCR provider: {provider}",
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
