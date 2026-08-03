#!/usr/bin/env python3
"""Maintain a private, portable JSON job-application ledger."""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

STATUSES = {
    "discovered",
    "rejected",
    "shortlisted",
    "approval-needed",
    "applied",
    "follow-up-due",
    "replied",
    "interview",
    "offer",
    "closed",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def canonical_url(raw: str) -> str:
    parts = urlsplit(raw.strip())
    path = parts.path.rstrip("/")
    if "linkedin.com" in parts.netloc.lower():
        segments = [segment for segment in path.split("/") if segment]
        if len(segments) >= 3 and segments[:2] == ["jobs", "view"]:
            path = f"/jobs/view/{segments[2]}"
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), path, "", ""))


def load(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("ledger root must be a JSON array")
    return data


def save(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def parse_score(value: str) -> int:
    score = int(value)
    if not 0 <= score <= 100:
        raise argparse.ArgumentTypeError("score must be between 0 and 100")
    return score


def validate_date(value: str) -> str:
    date.fromisoformat(value)
    return value


def find_record(
    records: list[dict[str, Any]], record_id: str
) -> dict[str, Any]:
    matches = [
        record
        for record in records
        if str(record.get("id", "")).startswith(record_id)
    ]
    if not matches:
        raise ValueError(f"record not found: {record_id}")
    if len(matches) > 1:
        raise ValueError(f"ambiguous record id: {record_id}")
    return matches[0]


def command_init(args: argparse.Namespace) -> int:
    path = Path(args.ledger).expanduser()
    if path.exists() and not args.force:
        print(f"ledger already exists: {path}", file=sys.stderr)
        return 1
    save(path, [])
    print(f"initialized ledger: {path}")
    return 0


def command_add(args: argparse.Namespace) -> int:
    path = Path(args.ledger).expanduser()
    records = load(path)
    normalized = canonical_url(args.url)
    duplicate = next(
        (
            record
            for record in records
            if record.get("canonical_url") == normalized
        ),
        None,
    )
    if duplicate and not args.allow_duplicate:
        print(
            f"duplicate {duplicate['id']}: "
            f"{duplicate['company']} — {duplicate['role']}"
        )
        return 0

    timestamp = now_iso()
    record = {
        "id": uuid.uuid4().hex[:12],
        "created_at": timestamp,
        "updated_at": timestamp,
        "company": args.company,
        "role": args.role,
        "url": args.url,
        "canonical_url": normalized,
        "source": args.source,
        "status": args.status,
        "score": args.score,
        "location": args.location,
        "employment_type": args.employment_type,
        "compensation": args.compensation,
        "applied_at": args.applied_at,
        "follow_up_at": args.follow_up_at,
        "contact": args.contact,
        "resume": args.resume,
        "notes": args.notes,
    }
    records.append(record)
    save(path, records)
    print(f"added {record['id']}: {record['company']} — {record['role']}")
    return 0


def command_update(args: argparse.Namespace) -> int:
    path = Path(args.ledger).expanduser()
    records = load(path)
    record = find_record(records, args.id)
    fields = (
        "status",
        "score",
        "compensation",
        "applied_at",
        "follow_up_at",
        "contact",
        "resume",
        "notes",
    )
    changed = False
    for field in fields:
        value = getattr(args, field)
        if value is not None:
            record[field] = value
            changed = True
    if not changed:
        print("no updates supplied", file=sys.stderr)
        return 1
    record["updated_at"] = now_iso()
    save(path, records)
    print(f"updated {record['id']}: {record['status']}")
    return 0


def filtered_records(args: argparse.Namespace) -> list[dict[str, Any]]:
    records = load(Path(args.ledger).expanduser())
    if getattr(args, "status", None):
        records = [
            record
            for record in records
            if record.get("status") == args.status
        ]
    return sorted(
        records,
        key=lambda item: item.get("updated_at", ""),
        reverse=True,
    )


def command_list(args: argparse.Namespace) -> int:
    records = filtered_records(args)
    if args.json:
        print(json.dumps(records, indent=2, ensure_ascii=False))
        return 0
    for record in records:
        print(
            f"{record['id']}\t{record['status']}\t"
            f"{record.get('score', '')}\t{record['company']}\t"
            f"{record['role']}\t{record['url']}"
        )
    return 0


def command_due(args: argparse.Namespace) -> int:
    cutoff = args.on or date.today().isoformat()
    records = load(Path(args.ledger).expanduser())
    due = [
        record
        for record in records
        if record.get("follow_up_at")
        and record["follow_up_at"] <= cutoff
        and record.get("status") not in {"rejected", "closed", "offer"}
    ]
    for record in sorted(due, key=lambda item: item["follow_up_at"]):
        print(
            f"{record['id']}\t{record['follow_up_at']}\t"
            f"{record['status']}\t{record['company']}\t{record['role']}"
        )
    return 0


def command_export_markdown(args: argparse.Namespace) -> int:
    records = load(Path(args.ledger).expanduser())
    lines = [
        "# Job Application Ledger",
        "",
        "| Updated | Status | Score | Company | Role | Follow-up |",
        "|---|---|---:|---|---|---|",
    ]
    records.sort(
        key=lambda item: item.get("updated_at", ""),
        reverse=True,
    )
    for record in records:
        company = str(record["company"]).replace("|", "\\|")
        role = str(record["role"]).replace("|", "\\|")
        lines.append(
            f"| {record.get('updated_at', '')[:10]} | "
            f"{record['status']} | {record.get('score', '')} | "
            f"[{company}]({record['url']}) | {role} | "
            f"{record.get('follow_up_at') or ''} |"
        )
    output = Path(args.output).expanduser()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"exported markdown: {output}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    init_parser = subparsers.add_parser("init")
    init_parser.add_argument("ledger")
    init_parser.add_argument("--force", action="store_true")
    init_parser.set_defaults(function=command_init)

    add_parser = subparsers.add_parser("add")
    add_parser.add_argument("ledger")
    add_parser.add_argument("--company", required=True)
    add_parser.add_argument("--role", required=True)
    add_parser.add_argument("--url", required=True)
    add_parser.add_argument("--source", required=True)
    add_parser.add_argument(
        "--status", choices=sorted(STATUSES), default="discovered"
    )
    add_parser.add_argument("--score", type=parse_score)
    add_parser.add_argument("--location", default="")
    add_parser.add_argument("--employment-type", default="")
    add_parser.add_argument("--compensation", default="")
    add_parser.add_argument("--applied-at", default="")
    add_parser.add_argument("--follow-up-at", type=validate_date, default="")
    add_parser.add_argument("--contact", default="")
    add_parser.add_argument("--resume", default="")
    add_parser.add_argument("--notes", default="")
    add_parser.add_argument("--allow-duplicate", action="store_true")
    add_parser.set_defaults(function=command_add)

    update_parser = subparsers.add_parser("update")
    update_parser.add_argument("ledger")
    update_parser.add_argument("id")
    update_parser.add_argument("--status", choices=sorted(STATUSES))
    update_parser.add_argument("--score", type=parse_score)
    update_parser.add_argument("--compensation")
    update_parser.add_argument("--applied-at")
    update_parser.add_argument("--follow-up-at", type=validate_date)
    update_parser.add_argument("--contact")
    update_parser.add_argument("--resume")
    update_parser.add_argument("--notes")
    update_parser.set_defaults(function=command_update)

    list_parser = subparsers.add_parser("list")
    list_parser.add_argument("ledger")
    list_parser.add_argument("--status", choices=sorted(STATUSES))
    list_parser.add_argument("--json", action="store_true")
    list_parser.set_defaults(function=command_list)

    due_parser = subparsers.add_parser("due")
    due_parser.add_argument("ledger")
    due_parser.add_argument("--on", type=validate_date)
    due_parser.set_defaults(function=command_due)

    export_parser = subparsers.add_parser("export-markdown")
    export_parser.add_argument("ledger")
    export_parser.add_argument("output")
    export_parser.set_defaults(function=command_export_markdown)
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return int(args.function(args))
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
