from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_TERMS = {
    "Home": "首页",
    "Feed": "动态",
    "Pullrequests": "拉取请求",
    "All repositories": "所有仓库",
    "Vscode": "VS Code",
    "Mock+Cache": "Mock + 缓存",
    "F-Droid": "F-Droid",
    "Google Play": "Google Play",
    "SimpleX Chat team profile.": "SimpleX Chat 团队简介。",
}

ROOT = Path(__file__).resolve().parents[1]
GLOSSARY_PATH = ROOT / "config" / "glossary.zh-CN.json"


def post_json(base_url: str, path: str, payload: dict[str, Any], timeout: int) -> dict[str, Any]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def get_json(base_url: str, path: str, timeout: int) -> dict[str, Any]:
    with urllib.request.urlopen(f"{base_url.rstrip('/')}{path}", timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def collect_images(images: list[str], image_dirs: list[str]) -> list[Path]:
    collected: list[Path] = []
    for image in images:
        path = Path(image)
        if not path.exists():
            raise SystemExit(f"image not found: {path}")
        collected.append(path)

    for image_dir in image_dirs:
        directory = Path(image_dir)
        if not directory.exists():
            raise SystemExit(f"image directory not found: {directory}")
        for path in sorted(directory.iterdir()):
            if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp", ".bmp"}:
                collected.append(path)

    return collected


def test_health(base_url: str, timeout: int) -> dict[str, Any]:
    health = get_json(base_url, "/health", timeout)
    if not health.get("ok"):
        raise SystemExit(f"sidecar health check failed: {health}")

    ocr = health.get("ocr", {})
    translation = health.get("translation", {})
    glossary = health.get("glossary", {})
    if glossary.get("error"):
        raise SystemExit(f"glossary failed to load: {glossary.get('error')}")
    print(
        "health ok: version={version}, ocr={ocr}, translation={translation}, glossaryTerms={terms}".format(
            version=health.get("version"),
            ocr=ocr.get("provider"),
            translation=translation.get("provider"),
            terms=glossary.get("terms"),
        )
    )
    return health


def test_glossary(base_url: str, timeout: int) -> None:
    glossary = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    configured_terms = glossary.get("terms", {})
    if not isinstance(configured_terms, dict) or not configured_terms:
        raise SystemExit(f"glossary terms are missing or invalid: {GLOSSARY_PATH}")

    expected_terms = {
        key: configured_terms.get(key, fallback)
        for key, fallback in DEFAULT_TERMS.items()
    }
    terms = list(expected_terms.keys())
    response = post_json(
        base_url,
        "/translate",
        {
            "texts": terms,
            "target_language": "zh-CN",
            "engine": "local",
            "source_language": "en",
        },
        timeout,
    )
    translations = response.get("translations", [])
    if not response.get("ok") or len(translations) != len(terms):
        raise SystemExit(f"glossary translation failed: {response}")

    mismatches = [
        (source, expected_terms[source], actual)
        for source, actual in zip(terms, translations)
        if actual != expected_terms[source]
    ]
    if mismatches:
        lines = [f"{source}: expected {expected!r}, got {actual!r}" for source, expected, actual in mismatches]
        raise SystemExit("glossary regression failed:\n" + "\n".join(lines))

    print(f"glossary ok: {len(terms)} terms via {response.get('provider')}")


def test_glossary_endpoint(base_url: str, timeout: int) -> None:
    glossary = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    configured_terms = glossary.get("terms", {})
    configured_replacements = glossary.get("brandReplacements", {})
    response = get_json(base_url, "/glossary", timeout)

    if not response.get("ok"):
        raise SystemExit(f"glossary endpoint failed: {response}")

    terms = response.get("terms", [])
    replacements = response.get("brand_replacements", [])
    if len(terms) != len(configured_terms):
        raise SystemExit(
            f"glossary endpoint term count mismatch: expected {len(configured_terms)}, got {len(terms)}"
        )
    if len(replacements) != len(configured_replacements):
        raise SystemExit(
            "glossary endpoint replacement count mismatch: "
            f"expected {len(configured_replacements)}, got {len(replacements)}"
        )

    print(f"glossary endpoint ok: terms={len(terms)}, brandReplacements={len(replacements)}")


def mapping_to_entries(mapping: dict[str, str]) -> list[dict[str, str]]:
    return [
        {"source": source, "target": target}
        for source, target in mapping.items()
    ]


def test_glossary_save_endpoint(base_url: str, timeout: int) -> None:
    glossary = json.loads(GLOSSARY_PATH.read_text(encoding="utf-8"))
    configured_terms = glossary.get("terms", {})
    configured_replacements = glossary.get("brandReplacements", {})
    if not isinstance(configured_terms, dict) or not isinstance(configured_replacements, dict):
        raise SystemExit(f"glossary file is invalid: {GLOSSARY_PATH}")

    response = post_json(
        base_url,
        "/glossary",
        {
            "terms": mapping_to_entries(configured_terms),
            "brand_replacements": mapping_to_entries(configured_replacements),
        },
        timeout,
    )
    if not response.get("ok"):
        raise SystemExit(f"glossary save endpoint failed: {response}")

    terms = response.get("terms", [])
    replacements = response.get("brand_replacements", [])
    if len(terms) != len(configured_terms) or len(replacements) != len(configured_replacements):
        raise SystemExit(f"glossary save endpoint count mismatch: {response}")

    print(f"glossary save ok: terms={len(terms)}, brandReplacements={len(replacements)}")


def test_repeated_translation(base_url: str, timeout: int) -> None:
    texts = [
        "Track total merges by adoption phase in enterprise reports",
        "The channel through which you share the link does not have to be secure",
    ]
    payload = {
        "texts": texts,
        "target_language": "zh-CN",
        "engine": "local",
        "source_language": "en",
    }
    first = post_json(base_url, "/translate", payload, timeout)
    second = post_json(base_url, "/translate", payload, timeout)

    for label, response in (("first", first), ("second", second)):
        translations = response.get("translations", [])
        if not response.get("ok") or len(translations) != len(texts):
            raise SystemExit(f"{label} repeated translation check failed: {response}")

    print(
        "translation repeat ok: first={first_ms}ms, second={second_ms}ms, provider={provider}".format(
            first_ms=first.get("elapsed_ms"),
            second_ms=second.get("elapsed_ms"),
            provider=second.get("provider"),
        )
    )


def test_images(base_url: str, images: list[Path], timeout: int, max_samples: int) -> None:
    if not images:
        print("image OCR skipped: no --image or --image-dir provided")
        return

    for image in images:
        start = time.perf_counter()
        ocr_payload = {"image_path": str(image), "mode": "local", "language_hint": "en"}
        ocr = post_json(
            base_url,
            "/ocr",
            ocr_payload,
            timeout,
        )
        blocks = ocr.get("blocks", [])
        if not ocr.get("ok") or not blocks:
            raise SystemExit(f"OCR failed for {image}: {ocr}")

        repeated_ocr = post_json(base_url, "/ocr", ocr_payload, timeout)
        if not repeated_ocr.get("ok") or len(repeated_ocr.get("blocks", [])) != len(blocks):
            raise SystemExit(f"repeated OCR failed for {image}: {repeated_ocr}")

        texts = [block["text"] for block in blocks]
        translation = post_json(
            base_url,
            "/translate",
            {
                "texts": texts,
                "target_language": "zh-CN",
                "engine": "local",
                "source_language": "en",
            },
            timeout,
        )
        translations = translation.get("translations", [])
        if not translation.get("ok") or len(translations) != len(texts):
            raise SystemExit(f"translation failed for {image}: {translation}")

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        print(
            "{name}: blocks={blocks}, ocr={ocr_ms}ms, ocrRepeat={ocr_repeat_ms}ms/{ocr_repeat_provider}, translate={translate_ms}ms, total={total_ms}ms".format(
                name=image.name,
                blocks=len(blocks),
                ocr_ms=ocr.get("elapsed_ms"),
                ocr_repeat_ms=repeated_ocr.get("elapsed_ms"),
                ocr_repeat_provider=repeated_ocr.get("provider"),
                translate_ms=translation.get("elapsed_ms"),
                total_ms=elapsed_ms,
            )
        )
        for source, target in list(zip(texts, translations))[:max_samples]:
            print(f"  {source} => {target}")


def test_cache_clear(base_url: str, timeout: int) -> None:
    response = post_json(base_url, "/cache/clear", {}, timeout)
    cache = response.get("cache", {})
    if not response.get("ok") or cache.get("ocr") != 0 or cache.get("translation") != 0:
        raise SystemExit(f"cache clear failed: {response}")
    print("cache clear ok: ocr=0, translation=0")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run local sidecar OCR/translation flow checks.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8765")
    parser.add_argument("--image", action="append", default=[], help="Image file to OCR and translate.")
    parser.add_argument("--image-dir", action="append", default=[], help="Directory of images to test.")
    parser.add_argument("--timeout", type=int, default=120)
    parser.add_argument("--max-samples", type=int, default=6)
    args = parser.parse_args()

    try:
        test_health(args.base_url, args.timeout)
        test_glossary_endpoint(args.base_url, args.timeout)
        test_glossary_save_endpoint(args.base_url, args.timeout)
        test_glossary(args.base_url, args.timeout)
        test_repeated_translation(args.base_url, args.timeout)
        test_images(args.base_url, collect_images(args.image, args.image_dir), args.timeout, args.max_samples)
        test_cache_clear(args.base_url, args.timeout)
    except urllib.error.URLError as error:
        raise SystemExit(f"sidecar request failed: {error}") from error


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
