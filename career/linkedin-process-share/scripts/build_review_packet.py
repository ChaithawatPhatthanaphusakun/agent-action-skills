#!/usr/bin/env python3
"""Build an immutable, review-only LinkedIn preview from audited public evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

ALLOWED_REPOSITORIES = {
    "iampon-p/skills",
    "iampon-p/edit-video",
    "iampon-p/fixbill-cli",
    "iampon-p/job-hunter",
}
ALLOWED_SUFFIXES = {".md", ".txt"}
MAX_EVIDENCE_BYTES = 100_000
REMOTE = re.compile(r"(?:https://github\.com/|git@github\.com:)(iampon-p/[A-Za-z0-9_.-]+)(?:\.git)?/?$")
LINKEDIN_ACCOUNT = re.compile(r"https://www\.linkedin\.com/in/[A-Za-z0-9_-]+/?$")
AUDIENCES = ("anyone", "connections")
MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".mp4", ".webm", ".pdf"}
CLASSIFICATION_FIELDS = (
    "employer_data", "customer_data", "analytics_data", "private_data",
    "unreleased_data",
)
# Match actual values and concrete privacy clues, not generic policy wording.
SENSITIVE = re.compile(
    r"/(?:Users|home)/[^/\s]+/|"
    r"(?:api[_ -]?key|secret|password|(?:access[_ -]?)?token)\s*[:=]\s*\S+|"
    r"\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{8,}\b|"
    r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|"
    r"(?:\+?\d[\d .()/-]{7,}\d)|"
    r"(?:home\s+address|date\s+of\s+birth|passport|national\s+id|"
    r"social\s+security|tax\s+id|recovery\s+(?:code|key)|security\s+question)\b|"
    r"(?:\b\d{1,6}\s+[A-Za-z][A-Za-z .'-]{2,}\s+(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|drive|dr\.?)\b)|"
    r"(?:\b-?\d{1,2}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}\b)|"
    r"(?:currently\s+(?:in|at)|travel(?:ing|ling)\s+to|flight\s+(?:to|on)|"
    r"daily\s+routine|every\s+(?:morning|evening)|usually\s+at)\b|"
    r"(?:\b(?:employer|customer|client|private|unreleased)\s*[:=]\s*\S+)|"
    r"(?:\b(?:employer|customer|client|analytics)\s+"
    r"(?:data|dashboard|metrics?|results?|showed|revealed|measured)\b)|"
    r"(?:\b(?:at|for|with)\s+(?:my|our|the)\s+(?:employer|customer|client)\b)",
    re.IGNORECASE,
)


def git(root: Path, *args: str, text: bool = True) -> str | bytes:
    result = subprocess.run(["git", "-C", str(root), *args], text=text, capture_output=True, check=False)
    if result.returncode:
        detail = result.stderr.strip() if text else result.stderr.decode(errors="replace").strip()
        raise ValueError(detail or "Git metadata unavailable")
    return result.stdout.strip() if text else result.stdout


def has_symlink_component(path: Path) -> bool:
    """Check every existing component before resolving, including parent links."""
    system_aliases = {Path("/tmp"), Path("/var"), Path("/etc")}
    current = path.absolute()
    while True:
        if current.exists() or current.is_symlink():
            if current.is_symlink() and current not in system_aliases:
                return True
        if current.parent == current:
            return False
        current = current.parent


def safe_external_file(raw: Path, root: Path, label: str) -> Path:
    if has_symlink_component(raw):
        raise ValueError(f"{label} may not use a symlink or symlink parent")
    resolved = raw.expanduser().resolve()
    if resolved.is_relative_to(root):
        raise ValueError(f"{label} must be outside repo-root")
    if not resolved.is_file():
        raise ValueError(f"{label} must be a regular file")
    return resolved


def repository_from_remote(remote: str) -> str:
    match = REMOTE.fullmatch(remote)
    repository = match.group(1).removesuffix(".git") if match else ""
    if repository not in ALLOWED_REPOSITORIES:
        raise ValueError("origin must be an audited public iampon-p repository")
    return repository


def verify_public_commit(repository: str, commit: str) -> bool:
    """Anonymously confirm the exact commit is reachable in the public GitHub API."""
    request = Request(
        f"https://api.github.com/repos/{repository}/commits/{commit}",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "linkedin-process-share-gate"},
    )
    try:
        with urlopen(request, timeout=10) as response:  # nosec B310: fixed GitHub API URL
            if response.status != 200:
                return False
            payload = json.load(response)
    except (URLError, TimeoutError, OSError, json.JSONDecodeError):
        return False
    return payload.get("sha", "").lower() == commit.lower()


def text_is_safe(value: str) -> bool:
    return bool(value.strip()) and not SENSITIVE.search(value)


def media_preview(values: list[str], root: Path) -> dict:
    if values == ["no-media"]:
        return {"mode": "no-media", "files": []}
    if "no-media" in values:
        raise ValueError("no-media may not be combined with media files")
    files: list[dict[str, str | int]] = []
    seen: set[Path] = set()
    for raw_value in values:
        path = safe_external_file(Path(raw_value), root, "media")
        if path in seen:
            raise ValueError("duplicate media file")
        seen.add(path)
        if path.suffix.lower() not in MEDIA_SUFFIXES:
            raise ValueError(f"unsupported media type: {path.name}")
        if not text_is_safe(path.name):
            raise ValueError(f"privacy-sensitive media filename: {path.name}")
        content = path.read_bytes()
        files.append({
            "filename": path.name,
            "sha256": hashlib.sha256(content).hexdigest(),
            "size_bytes": len(content),
        })
    if not files:
        raise ValueError("provide no-media or at least one media file")
    return {"mode": "files", "files": files}


def immutable_evidence(root: Path, raw_path: str) -> tuple[Path, bytes]:
    relative = Path(raw_path)
    if relative.is_absolute() or ".." in relative.parts:
        raise ValueError(f"evidence must be repository-relative: {raw_path}")
    raw_candidate = root / relative
    if has_symlink_component(raw_candidate):
        raise ValueError(f"evidence may not use a symlink or symlink parent: {raw_path}")
    candidate = raw_candidate.resolve()
    if not candidate.is_relative_to(root) or not candidate.is_file() or candidate.suffix.lower() not in ALLOWED_SUFFIXES:
        raise ValueError(f"unsupported evidence file: {raw_path}")
    if candidate.stat().st_size > MAX_EVIDENCE_BYTES:
        raise ValueError(f"evidence file is too large: {raw_path}")
    try:
        git(root, "ls-files", "--error-unmatch", "--", raw_path)
        git(root, "diff", "--quiet", "HEAD", "--", raw_path)
        committed = git(root, "show", f"HEAD:{raw_path}", text=False)
    except ValueError as error:
        raise ValueError(f"evidence must be tracked and unchanged at HEAD: {raw_path}") from error
    actual = candidate.read_bytes()
    if actual != committed:
        raise ValueError(f"evidence is not byte-identical to HEAD: {raw_path}")
    return candidate, actual


def fail(message: str) -> int:
    print(f"error: {message}", file=sys.stderr)
    return 2


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", required=True, type=Path)
    parser.add_argument("--evidence", required=True, nargs="+", help="Tracked repository-relative Markdown or text files")
    parser.add_argument("--draft", required=True, type=Path, help="Prepared draft file outside repo-root")
    parser.add_argument("--account", required=True)
    parser.add_argument("--audience", required=True, choices=AUDIENCES)
    parser.add_argument("--recruiter-benefit", required=True)
    parser.add_argument("--media", required=True, nargs="+", help="Use no-media or external media file paths")
    for field in CLASSIFICATION_FIELDS:
        parser.add_argument(
            f"--{field.replace('_', '-')}",
            required=True,
            choices=("false", "none", "true", "uncertain"),
        )
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--action", default="draft", choices=("draft", "publish"))
    args = parser.parse_args(argv)
    if args.action != "draft":
        return fail("publishing is intentionally unsupported; this gate creates review packets only")
    if has_symlink_component(args.repo_root):
        return fail("repo-root may not use a symlink or symlink parent")
    root = args.repo_root.expanduser().resolve()
    if not (root / ".git").exists():
        return fail("repo-root must be a Git checkout")
    try:
        remote = git(root, "remote", "get-url", "origin")
        commit = git(root, "rev-parse", "HEAD")
        repository = repository_from_remote(str(remote))
        if not verify_public_commit(repository, str(commit)):
            return fail("could not verify that repository HEAD is publicly reachable")
        draft_path = safe_external_file(args.draft, root, "draft")
        draft = draft_path.read_text(encoding="utf-8")
        if not LINKEDIN_ACCOUNT.fullmatch(args.account):
            return fail("account must be a canonical LinkedIn profile URL")
        if not all(text_is_safe(value) for value in (draft, args.recruiter_benefit)):
            return fail("draft or preview fields contain a privacy-sensitive signal")
        classifications = {field: getattr(args, field) for field in CLASSIFICATION_FIELDS}
        if any(value not in {"false", "none"} for value in classifications.values()):
            return fail("all disclosure classifications must be explicitly false or none")
        media = media_preview(args.media, root)
        evidence: list[dict[str, str]] = []
        for raw_path in dict.fromkeys(args.evidence):
            candidate, content = immutable_evidence(root, raw_path)
            text = content.decode("utf-8")
            if not text_is_safe(text):
                return fail(f"privacy-sensitive content in evidence: {raw_path}")
            evidence.append({
                "path": candidate.relative_to(root).as_posix(),
                "sha256": hashlib.sha256(content).hexdigest(),
            })
    except (UnicodeDecodeError, ValueError) as error:
        return fail(str(error))
    if not evidence:
        return fail("at least one evidence file is required")

    links = [f"https://github.com/{repository}/blob/{commit}/{item['path']}" for item in evidence]
    preview = {
        "text": draft,
        "links": links,
        "media": media,
        "audience": args.audience,
        "account": args.account,
        "recruiter_benefit": args.recruiter_benefit,
    }
    preview_json = json.dumps(preview, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    packet = {
        "status": "review_required",
        "publication": "not_authorized",
        "approval_required": True,
        "preview": preview,
        "preview_sha256": hashlib.sha256(preview_json.encode("utf-8")).hexdigest(),
        "classifications": classifications,
        "evidence": {"repository": f"https://github.com/{repository}", "commit": commit, "files": evidence},
    }
    if has_symlink_component(args.output):
        return fail("output may not use a symlink or symlink parent")
    output = args.output.expanduser().resolve()
    if output.is_relative_to(root):
        return fail("write review packets outside the repository")
    if output.exists():
        return fail("refusing to overwrite an existing review packet")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(packet, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
