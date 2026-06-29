from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import time
import uuid
from collections import OrderedDict
from functools import lru_cache
from pathlib import Path
from threading import RLock
from typing import Any, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

APP_VERSION = "0.5-local"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_APP_DATA = Path(os.getenv("LOCALAPPDATA", "."))
MODEL_DIR = Path(
    os.getenv("SCREENLINGUA_MODEL_DIR", LOCAL_APP_DATA / "ScreenLingua" / "models")
)
GLOSSARY_PATH = Path(
    os.getenv("SCREENLINGUA_GLOSSARY_PATH", PROJECT_ROOT / "config" / "glossary.zh-CN.json")
)
OCR_CACHE_MAX = int(os.getenv("SCREENLINGUA_OCR_CACHE_MAX", "32"))
TRANSLATION_CACHE_MAX = int(os.getenv("SCREENLINGUA_TRANSLATION_CACHE_MAX", "2048"))

app = FastAPI(title="ScreenLingua Local Sidecar", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "tauri://localhost",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

MOCK_WORDS = [
    {"text": "Render Settings", "bbox": [420, 180, 570, 212], "confidence": 0.96, "language": "en"},
    {"text": "Subdivision Surface", "bbox": [440, 260, 620, 292], "confidence": 0.94, "language": "en"},
    {"text": "Permission Denied", "bbox": [380, 330, 548, 362], "confidence": 0.97, "language": "en"},
    {"text": "Prompt Engineering", "bbox": [360, 410, 560, 442], "confidence": 0.95, "language": "en"},
]

MOCK_TRANSLATIONS = {
    "Render Settings": "渲染设置",
    "Subdivision Surface": "细分曲面",
    "Permission Denied": "权限被拒绝",
    "Prompt Engineering": "提示词工程",
    "Layer Style": "图层样式",
    "Blending Options": "混合选项",
    "Stroke Width": "描边宽度",
    "Drop Shadow": "投影",
    "Command Palette": "命令面板",
    "Toggle Terminal": "切换终端",
    "Debug Console": "调试控制台",
    "Container Logs": "容器日志",
    "Volume Mounts": "卷挂载",
}

def string_mapping(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    return {
        key: item
        for key, item in value.items()
        if isinstance(key, str) and isinstance(item, str)
    }


def load_local_glossary() -> tuple[dict[str, str], dict[str, str], Optional[str]]:
    try:
        data = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}, {}, f"Glossary file not found: {GLOSSARY_PATH}"
    except Exception as error:
        return {}, {}, f"Failed to load glossary file {GLOSSARY_PATH}: {error}"

    terms = string_mapping(data.get("terms"))
    brand_replacements = string_mapping(data.get("brandReplacements"))
    return terms, brand_replacements, None


UI_GLOSSARY, BRAND_REPLACEMENTS, GLOSSARY_ERROR = load_local_glossary()
CACHE_LOCK = RLock()
OCR_CACHE: OrderedDict[str, list[dict[str, Any]]] = OrderedDict()
TRANSLATION_CACHE: OrderedDict[tuple[str, str, str], str] = OrderedDict()


class OcrRequest(BaseModel):
    image_path: Optional[str] = None
    mode: str = "local"
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


class TranslateRequest(BaseModel):
    texts: List[str]
    target_language: str = "zh-CN"
    engine: str = "local"
    source_language: Optional[str] = "en"


class TranslateResponse(BaseModel):
    ok: bool
    provider: str
    elapsed_ms: int
    translations: List[str]
    error: Optional[str] = None


class GlossaryEntry(BaseModel):
    source: str
    target: str


class GlossaryResponse(BaseModel):
    ok: bool
    path: str
    terms: List[GlossaryEntry]
    brand_replacements: List[GlossaryEntry]
    error: Optional[str] = None


class GlossarySaveRequest(BaseModel):
    terms: List[GlossaryEntry]
    brand_replacements: List[GlossaryEntry]


def module_available(*module_names: str) -> bool:
    return any(importlib.util.find_spec(name) is not None for name in module_names)


def bounded_cache_get(cache: OrderedDict, key: Any) -> Any:
    with CACHE_LOCK:
        if key not in cache:
            return None
        value = cache.pop(key)
        cache[key] = value
        return value


def bounded_cache_set(cache: OrderedDict, key: Any, value: Any, max_size: int) -> None:
    if max_size <= 0:
        return
    with CACHE_LOCK:
        if key in cache:
            cache.pop(key)
        cache[key] = value
        while len(cache) > max_size:
            cache.popitem(last=False)


def cache_sizes() -> dict[str, int]:
    with CACHE_LOCK:
        return {
            "ocr": len(OCR_CACHE),
            "translation": len(TRANSLATION_CACHE),
            "ocr_max": OCR_CACHE_MAX,
            "translation_max": TRANSLATION_CACHE_MAX,
        }


def clear_translation_cache() -> None:
    with CACHE_LOCK:
        TRANSLATION_CACHE.clear()


def clear_all_caches() -> dict[str, int]:
    with CACHE_LOCK:
        OCR_CACHE.clear()
        TRANSLATION_CACHE.clear()
    return cache_sizes()


def clone_ocr_blocks(blocks: List[OcrBlock]) -> List[OcrBlock]:
    return [OcrBlock(**block.model_dump()) for block in blocks]


def get_cached_ocr_blocks(key: str) -> Optional[List[OcrBlock]]:
    cached = bounded_cache_get(OCR_CACHE, key)
    if cached is None:
        return None
    return [OcrBlock(**item) for item in cached]


def set_cached_ocr_blocks(key: str, blocks: List[OcrBlock]) -> None:
    bounded_cache_set(
        OCR_CACHE,
        key,
        [block.model_dump() for block in blocks],
        OCR_CACHE_MAX,
    )


def get_cached_translation(key: tuple[str, str, str]) -> Optional[str]:
    return bounded_cache_get(TRANSLATION_CACHE, key)


def set_cached_translation(key: tuple[str, str, str], value: str) -> None:
    bounded_cache_set(TRANSLATION_CACHE, key, value, TRANSLATION_CACHE_MAX)


def entries_to_mapping(entries: List[GlossaryEntry], field_name: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for index, entry in enumerate(entries, start=1):
        source = entry.source.strip()
        target = entry.target.strip()
        if not source or not target:
            raise ValueError(f"{field_name}[{index}] requires both source and target")
        if source in result:
            raise ValueError(f"{field_name}[{index}] duplicates source: {source}")
        result[source] = target
    return result


def persist_glossary(terms: dict[str, str], brand_replacements: dict[str, str]) -> None:
    payload = {
        "terms": terms,
        "brandReplacements": brand_replacements,
    }
    GLOSSARY_PATH.parent.mkdir(parents=True, exist_ok=True)
    temp_path = GLOSSARY_PATH.with_name(f"{GLOSSARY_PATH.name}.tmp")
    temp_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temp_path.replace(GLOSSARY_PATH)


def argos_package_status(source_language: str = "en", target_language: str = "zh") -> dict:
    if not module_available("argostranslate"):
        return {
            "source": source_language,
            "target": target_language,
            "installed": False,
            "error": "argostranslate is not installed",
        }

    try:
        import argostranslate.translate

        installed_languages = argostranslate.translate.get_installed_languages()
        source = next(
            (lang for lang in installed_languages if lang.code == source_language),
            None,
        )
        target = next(
            (lang for lang in installed_languages if lang.code == target_language),
            None,
        )

        if source is None or target is None:
            return {
                "source": source_language,
                "target": target_language,
                "installed": False,
                "error": "language package is not installed",
            }

        source.get_translation(target)
        return {
            "source": source_language,
            "target": target_language,
            "installed": True,
            "error": None,
        }
    except Exception as exc:
        return {
            "source": source_language,
            "target": target_language,
            "installed": False,
            "error": str(exc),
        }


def normalize_provider(value: Optional[str], default_provider: str) -> str:
    provider = (value or default_provider).strip().lower()
    if provider in {"", "local"}:
        return default_provider
    return provider


def normalize_language(language: Optional[str]) -> str:
    if not language:
        return "zh"
    normalized = language.lower().replace("_", "-")
    if normalized.startswith("zh"):
        return "zh"
    return normalized.split("-", 1)[0]


@lru_cache(maxsize=8)
def get_argos_translation(source_code: str, target_code: str) -> Any:
    import argostranslate.translate

    installed_languages = argostranslate.translate.get_installed_languages()
    source = next((lang for lang in installed_languages if lang.code == source_code), None)
    target = next((lang for lang in installed_languages if lang.code == target_code), None)

    if source is None or target is None:
        raise RuntimeError(
            f"Argos language package is missing: {source_code} -> {target_code}"
        )

    return source.get_translation(target)


def mock_ocr_response(start: float, provider: str, error: Optional[str] = None) -> OcrResponse:
    blocks = []
    for item in MOCK_WORDS:
        block = dict(item)
        block["id"] = f"mock-{uuid.uuid4().hex[:8]}"
        blocks.append(OcrBlock(**block))

    return OcrResponse(
        ok=True,
        provider=provider,
        elapsed_ms=int((time.time() - start) * 1000),
        blocks=blocks,
        error=error,
    )


def mock_translate(text: str) -> str:
    glossary_translation = translate_short_ui_text(text)
    if glossary_translation is not None:
        return glossary_translation

    return MOCK_TRANSLATIONS.get(text.strip(), f"{text}（本地待翻译）")


def normalize_glossary_key(text: str) -> str:
    normalized = text.strip()
    normalized = normalized.replace("•", "").replace("·", "").replace("☆", "")
    normalized = normalized.replace("／", "/")
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"^\W+", "", normalized)
    normalized = re.sub(r"\W+$", "", normalized)
    return normalized.lower()


@lru_cache(maxsize=1)
def normalized_glossary() -> dict:
    return {normalize_glossary_key(key): value for key, value in UI_GLOSSARY.items()}


def has_cjk(text: str) -> bool:
    return any("\u4e00" <= char <= "\u9fff" for char in text)


def has_latin(text: str) -> bool:
    return any(("a" <= char.lower() <= "z") for char in text)


def should_translate_with_argos(text: str) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    if has_cjk(stripped):
        return False
    if not has_latin(stripped):
        return False
    if len(stripped) <= 2:
        return False
    return True


def translate_short_ui_text(text: str) -> Optional[str]:
    stripped = text.strip()
    exact = UI_GLOSSARY.get(stripped)
    if exact is not None:
        return exact

    normalized = normalize_glossary_key(stripped)
    glossary = normalized_glossary()
    if normalized in glossary:
        return glossary[normalized]

    if re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", stripped):
        return stripped

    return None


def apply_brand_replacements(text: str) -> str:
    fixed = text
    for source, target in BRAND_REPLACEMENTS.items():
        fixed = fixed.replace(source, target)
    return fixed


def mock_translate_response(
    texts: List[str],
    start: float,
    provider: str,
    error: Optional[str] = None,
) -> TranslateResponse:
    return TranslateResponse(
        ok=True,
        provider=provider,
        elapsed_ms=int((time.time() - start) * 1000),
        translations=[mock_translate(text) for text in texts],
        error=error,
    )


@lru_cache(maxsize=1)
def get_rapidocr() -> Any:
    try:
        from rapidocr_onnxruntime import RapidOCR
    except ImportError:
        from rapidocr import RapidOCR

    return RapidOCR()


def normalize_bbox(box: Any) -> List[int]:
    points = list(box)
    if len(points) == 4 and all(isinstance(value, (int, float)) for value in points):
        return [int(value) for value in points]

    xs = [int(point[0]) for point in points]
    ys = [int(point[1]) for point in points]
    return [min(xs), min(ys), max(xs), max(ys)]


def image_cache_key(image_path: Path, language_hint: Optional[str]) -> str:
    digest = hashlib.sha256()
    with image_path.open("rb") as image:
        for chunk in iter(lambda: image.read(1024 * 1024), b""):
            digest.update(chunk)
    language = (language_hint or "auto").strip().lower()
    return f"{language}:{digest.hexdigest()}"


def block_height(block: OcrBlock) -> int:
    return max(1, block.bbox[3] - block.bbox[1])


def block_center_y(block: OcrBlock) -> float:
    return (block.bbox[1] + block.bbox[3]) / 2


def same_text_line(left: OcrBlock, right: OcrBlock) -> bool:
    max_height = max(block_height(left), block_height(right))
    center_delta = abs(block_center_y(left) - block_center_y(right))
    return center_delta <= max(8, max_height * 0.55)


def should_merge_neighbors(left: OcrBlock, right: OcrBlock) -> bool:
    if not same_text_line(left, right):
        return False

    gap = right.bbox[0] - left.bbox[2]
    if gap < -4:
        return False

    left_text = left.text.strip()
    right_text = right.text.strip()
    if gap > 4 and (len(left_text) <= 2 or len(right_text) <= 2):
        return False

    max_height = max(block_height(left), block_height(right))
    max_gap = max(12, int(max_height * 1.25))
    return gap <= max_gap


def join_ocr_text(left: str, right: str) -> str:
    left = left.strip()
    right = right.strip()
    if not left:
        return right
    if not right:
        return left
    if right[0] in ",.;:!?)]}":
        return left + right
    if left[-1] in "([{":
        return left + right
    return f"{left} {right}"


def merge_neighbor_blocks(left: OcrBlock, right: OcrBlock) -> OcrBlock:
    return OcrBlock(
        id=left.id or right.id,
        text=join_ocr_text(left.text, right.text),
        bbox=[
            min(left.bbox[0], right.bbox[0]),
            min(left.bbox[1], right.bbox[1]),
            max(left.bbox[2], right.bbox[2]),
            max(left.bbox[3], right.bbox[3]),
        ],
        confidence=(left.confidence + right.confidence) / 2,
        language=left.language or right.language,
    )


def merge_ocr_blocks(blocks: List[OcrBlock]) -> List[OcrBlock]:
    sorted_blocks = sorted(blocks, key=lambda block: (block.bbox[1], block.bbox[0]))
    lines: List[List[OcrBlock]] = []

    for block in sorted_blocks:
        matched_line = None
        for line in lines:
            if any(same_text_line(block, existing) for existing in line):
                matched_line = line
                break

        if matched_line is None:
            lines.append([block])
        else:
            matched_line.append(block)

    merged_blocks = []
    for line in lines:
        ordered_line = sorted(line, key=lambda block: block.bbox[0])
        current = ordered_line[0]

        for candidate in ordered_line[1:]:
            if should_merge_neighbors(current, candidate):
                current = merge_neighbor_blocks(current, candidate)
            else:
                merged_blocks.append(current)
                current = candidate

        merged_blocks.append(current)

    return sorted(merged_blocks, key=lambda block: (block.bbox[1], block.bbox[0]))


def run_rapidocr(image_path: Path, language_hint: Optional[str]) -> List[OcrBlock]:
    ocr = get_rapidocr()
    raw = ocr(str(image_path))
    items = raw[0] if isinstance(raw, tuple) else raw
    blocks = []

    for item in items or []:
        if len(item) < 3:
            continue
        box, text, confidence = item[0], str(item[1]), float(item[2])
        if not text.strip():
            continue
        blocks.append(
            OcrBlock(
                id=f"rapidocr-{uuid.uuid4().hex[:8]}",
                text=text,
                bbox=normalize_bbox(box),
                confidence=confidence,
                language=language_hint or "auto",
            )
        )

    return merge_ocr_blocks(blocks)



def run_argos_translate(
    texts: List[str],
    source_language: Optional[str],
    target_language: str,
) -> List[str]:
    source_code = normalize_language(source_language or "en")
    target_code = normalize_language(target_language)
    translation = get_argos_translation(source_code, target_code)
    translated_texts = []

    for text in texts:
        cache_key = (source_code, target_code, text)
        cached_translation = get_cached_translation(cache_key)
        if cached_translation is not None:
            translated_texts.append(cached_translation)
            continue

        glossary_translation = translate_short_ui_text(text)
        if glossary_translation is not None:
            translated_texts.append(glossary_translation)
            set_cached_translation(cache_key, glossary_translation)
            continue

        if not should_translate_with_argos(text):
            translated_texts.append(text)
            set_cached_translation(cache_key, text)
            continue

        translated = apply_brand_replacements(translation.translate(text))
        translated_texts.append(translated)
        set_cached_translation(cache_key, translated)

    return translated_texts


@app.get("/health")
def health():
    ocr_provider = normalize_provider(os.getenv("SCREENLINGUA_OCR_PROVIDER"), "rapidocr")
    translation_provider = normalize_provider(
        os.getenv("SCREENLINGUA_TRANSLATION_PROVIDER"), "argos"
    )

    return {
        "ok": True,
        "version": APP_VERSION,
        "mode": "local-first",
        "model_dir": str(MODEL_DIR),
        "ocr": {
            "provider": ocr_provider,
            "rapidocr_available": module_available("rapidocr_onnxruntime", "rapidocr"),
        },
        "translation": {
            "provider": translation_provider,
            "argos_available": module_available("argostranslate"),
            "packages": [
                argos_package_status("en", "zh"),
            ],
        },
        "glossary": {
            "path": str(GLOSSARY_PATH),
            "terms": len(UI_GLOSSARY),
            "brand_replacements": len(BRAND_REPLACEMENTS),
            "error": GLOSSARY_ERROR,
        },
        "cache": cache_sizes(),
        "privacy": "local-only",
    }


@app.post("/cache/clear")
def clear_cache():
    return {
        "ok": True,
        "cache": clear_all_caches(),
    }


@app.get("/glossary", response_model=GlossaryResponse)
def glossary():
    return GlossaryResponse(
        ok=GLOSSARY_ERROR is None,
        path=str(GLOSSARY_PATH),
        terms=[
            GlossaryEntry(source=source, target=target)
            for source, target in sorted(UI_GLOSSARY.items(), key=lambda item: item[0].lower())
        ],
        brand_replacements=[
            GlossaryEntry(source=source, target=target)
            for source, target in sorted(BRAND_REPLACEMENTS.items(), key=lambda item: item[0])
        ],
        error=GLOSSARY_ERROR,
    )


@app.post("/glossary", response_model=GlossaryResponse)
def save_glossary(req: GlossarySaveRequest):
    global UI_GLOSSARY, BRAND_REPLACEMENTS, GLOSSARY_ERROR

    try:
        terms = entries_to_mapping(req.terms, "terms")
        brand_replacements = entries_to_mapping(
            req.brand_replacements,
            "brand_replacements",
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    try:
        persist_glossary(terms, brand_replacements)
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save glossary file {GLOSSARY_PATH}: {error}",
        ) from error

    UI_GLOSSARY = terms
    BRAND_REPLACEMENTS = brand_replacements
    GLOSSARY_ERROR = None
    normalized_glossary.cache_clear()
    clear_translation_cache()
    return glossary()


@app.post("/ocr", response_model=OcrResponse)
def ocr(req: OcrRequest):
    start = time.time()
    provider = normalize_provider(
        os.getenv("SCREENLINGUA_OCR_PROVIDER", req.mode), "rapidocr"
    )

    if provider == "mock":
        time.sleep(0.15)
        return mock_ocr_response(start, "mock")

    if provider != "rapidocr":
        return OcrResponse(
            ok=False,
            provider=provider,
            elapsed_ms=int((time.time() - start) * 1000),
            blocks=[],
            error=f"Unknown OCR provider: {provider}",
        )

    if not req.image_path:
        return mock_ocr_response(
            start,
            "mock-local-no-image",
            "No image_path was provided; using local mock OCR.",
        )

    image = Path(req.image_path)
    if not image.exists():
        raise HTTPException(status_code=404, detail="image_path not found")

    try:
        cache_key = image_cache_key(image, req.language_hint)
        cached_blocks = get_cached_ocr_blocks(cache_key)
        if cached_blocks is not None:
            return OcrResponse(
                ok=True,
                provider="rapidocr-cache",
                elapsed_ms=int((time.time() - start) * 1000),
                blocks=cached_blocks,
            )

        blocks = run_rapidocr(image, req.language_hint)
        set_cached_ocr_blocks(cache_key, blocks)
    except Exception as exc:
        return mock_ocr_response(
            start,
            "mock-local-fallback",
            f"RapidOCR unavailable or failed: {exc}",
        )

    return OcrResponse(
        ok=True,
        provider="rapidocr",
        elapsed_ms=int((time.time() - start) * 1000),
        blocks=blocks,
    )


@app.post("/translate", response_model=TranslateResponse)
def translate(req: TranslateRequest):
    start = time.time()
    provider = normalize_provider(
        os.getenv("SCREENLINGUA_TRANSLATION_PROVIDER", req.engine), "argos"
    )

    if provider == "mock":
        return mock_translate_response(req.texts, start, "mock")

    if provider != "argos":
        return TranslateResponse(
            ok=False,
            provider=provider,
            elapsed_ms=int((time.time() - start) * 1000),
            translations=[],
            error=f"Unknown translation provider: {provider}",
        )

    try:
        translations = run_argos_translate(
            req.texts,
            req.source_language,
            req.target_language,
        )
    except Exception as exc:
        return mock_translate_response(
            req.texts,
            start,
            "mock-local-fallback",
            f"Argos Translate unavailable or missing model: {exc}",
        )

    return TranslateResponse(
        ok=True,
        provider="argos",
        elapsed_ms=int((time.time() - start) * 1000),
        translations=translations,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8765)
