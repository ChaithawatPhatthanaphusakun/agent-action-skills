#!/usr/bin/env python3
"""Validate the minimal shape of a private job-hunter profile."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any


def nested(data: dict[str, Any], path: str) -> Any:
    value: Any = data
    for part in path.split("."):
        if not isinstance(value, dict) or part not in value:
            raise KeyError(path)
        value = value[part]
    return value


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: validate_profile.py PROFILE.json", file=sys.stderr)
        return 2

    path = Path(sys.argv[1]).expanduser()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        print(f"profile not found: {path}", file=sys.stderr)
        return 1
    except json.JSONDecodeError as exc:
        print(
            f"invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}",
            file=sys.stderr,
        )
        return 1

    required = (
        "version",
        "paths.canonical_resume",
        "targets.roles",
        "constraints",
        "approvals.mode",
    )
    missing = []
    for field in required:
        try:
            value = nested(data, field)
            if value in (None, "", []):
                missing.append(field)
        except KeyError:
            missing.append(field)

    try:
        mode = nested(data, "approvals.mode")
        if mode not in {"research", "review", "autopilot"}:
            print(
                "approvals.mode must be research, review, or autopilot",
                file=sys.stderr,
            )
            return 1
    except KeyError:
        pass

    if missing:
        print("missing required fields: " + ", ".join(missing), file=sys.stderr)
        return 1

    print(f"valid job-hunter profile: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
