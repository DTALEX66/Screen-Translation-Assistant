from __future__ import annotations

import argparse
import sys

import argostranslate.package
import argostranslate.translate


def language_package_installed(source: str, target: str) -> bool:
    installed_languages = argostranslate.translate.get_installed_languages()
    source_language = next((lang for lang in installed_languages if lang.code == source), None)
    target_language = next((lang for lang in installed_languages if lang.code == target), None)

    if source_language is None or target_language is None:
        return False

    try:
        source_language.get_translation(target_language)
        return True
    except Exception:
        return False


def install_language_package(source: str, target: str) -> None:
    if language_package_installed(source, target):
        print(f"Argos package already installed: {source} -> {target}")
        return

    print("Updating Argos package index...")
    argostranslate.package.update_package_index()
    available_packages = argostranslate.package.get_available_packages()
    package = next(
        (
            item
            for item in available_packages
            if item.from_code == source and item.to_code == target
        ),
        None,
    )

    if package is None:
        raise SystemExit(f"No Argos package found for {source} -> {target}")

    print(f"Downloading Argos package: {source} -> {target}")
    package_path = package.download()
    print(f"Installing Argos package from {package_path}")
    argostranslate.package.install_from_path(package_path)

    if not language_package_installed(source, target):
        raise SystemExit(f"Argos package install did not register: {source} -> {target}")

    print(f"Argos package installed: {source} -> {target}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Install an Argos Translate language package.")
    parser.add_argument("--from", dest="source", default="en", help="source language code")
    parser.add_argument("--to", dest="target", default="zh", help="target language code")
    args = parser.parse_args()

    install_language_package(args.source, args.target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
