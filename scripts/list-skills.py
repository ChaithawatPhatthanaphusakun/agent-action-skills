#!/usr/bin/env python3
"""List installable skill directories in this checkout."""

from __future__ import annotations

import argparse
from pathlib import Path


def skills(root: Path) -> list[Path]:
    return sorted(
        path.parent
        for path in root.rglob("SKILL.md")
        if ".git" not in path.parts and not path.is_symlink()
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--format", choices=("paths", "table"), default="paths")
    args = parser.parse_args()
    root = args.root.resolve()
    found = skills(root)
    if args.format == "table":
        print("install path\tname")
    for skill in found:
        relative = skill.relative_to(root).as_posix()
        if args.format == "table":
            print(f"{relative}\t{skill.name}")
        else:
            print(relative)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
