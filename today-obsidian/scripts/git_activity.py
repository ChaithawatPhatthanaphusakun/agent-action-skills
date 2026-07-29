#!/usr/bin/env python3
"""Gather deterministic git-commit signal for /today-obsidian.

Mirrors daily-standup/gather.py's git_commits() approach (git -C <repo> log
--all --since --author=<email> --no-merges, hash-deduped across repos) but
scoped to today-obsidian's own window and repo-discovery rule:

  - Repos discovered under ~/work/active/*/ (depth 1-2, .git dirs) — the
    "active project" convention set up 2026-07-13/20.
  - Plus any extra repo cwd passed on argv (so a Claude/Codex session cwd
    outside ~/work/active/ is still covered, unioned the same way
    daily-standup unions session cwds with git_commits()).

This script only GATHERS and prints markdown. It never writes to the vault —
the agent reads this digest and folds it into the daily note itself, same
division of responsibility as daily-standup/gather.py.

Usage:
  git_activity.py --since 2026-07-19               # since last daily note date, 00:00 local
  git_activity.py --since 2026-07-19 --extra-cwd /path/to/other/repo
"""
import argparse, glob, os, subprocess, sys
from datetime import datetime

HOME = os.path.expanduser("~")
ACTIVE_ROOT = os.path.join(HOME, "work", "active")


def discover_active_repos():
    """.git dirs directly under ~/work/active/<project>/ or one level deeper
    (covers a project dir that is itself a plain folder containing several
    repos, e.g. ~/work/<org>/<sub-repo>/.git)."""
    repos = set()
    for pat in (
        os.path.join(ACTIVE_ROOT, "*", ".git"),
        os.path.join(ACTIVE_ROOT, "*", "*", ".git"),
    ):
        for git_dir in glob.glob(pat):
            repos.add(os.path.dirname(git_dir))
    return repos


def proj_label(path):
    if not path:
        return "(unknown)"
    parts = path.rstrip("/").split("/")
    # keep it readable: last 2 path segments, or last 3 if under work/active
    if "active" in parts:
        idx = parts.index("active")
        return "/".join(parts[idx + 1:])
    return "/".join(parts[-2:]) if len(parts) >= 2 else parts[-1]


def git_commits(repos, since_iso):
    out, seen = {}, set()
    for repo in sorted(repos):
        if not repo or not os.path.isdir(repo):
            continue
        try:
            email = subprocess.run(
                ["git", "-C", repo, "config", "user.email"],
                capture_output=True, text=True, timeout=10,
            ).stdout.strip()
            log = subprocess.run(
                ["git", "-C", repo, "log", "--all", f"--since={since_iso}",
                 f"--author={email}", "--pretty=%h %ad %s", "--date=short",
                 "--no-merges", "-n", "80"],
                capture_output=True, text=True, timeout=15,
            ).stdout.strip()
        except Exception:
            continue
        fresh = []
        for line in log.splitlines():
            h = line.split(" ", 1)[0]
            if h in seen:
                continue
            seen.add(h)
            fresh.append(line)
        if fresh:
            out[proj_label(repo)] = fresh
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", required=True,
                     help="ISO date/time, e.g. 2026-07-19 or 2026-07-19T00:00:00")
    ap.add_argument("--extra-cwd", action="append", default=[],
                     help="additional repo path to include (from session cwd), repeatable")
    args = ap.parse_args()

    repos = discover_active_repos()
    for cwd in args.extra_cwd:
        # walk up to find the repo root if a subdirectory was passed
        p = cwd
        while p and p != "/":
            if os.path.isdir(os.path.join(p, ".git")):
                repos.add(p)
                break
            p = os.path.dirname(p)

    commits = git_commits(repos, args.since)

    print(f"## GIT COMMITS (author=me, since {args.since})")
    print(f"# repos scanned: {len(repos)} under {ACTIVE_ROOT} (+ extra-cwd)")
    if not commits:
        print("(none)")
        return
    for proj, lines in sorted(commits.items()):
        print(f"### {proj}")
        for l in lines:
            print(f"  {l}")


if __name__ == "__main__":
    main()
