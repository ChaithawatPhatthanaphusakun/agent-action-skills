# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

`iampon-p/agent-action-skills` is a curated, public-safe library of portable **agent skill
packages** — drop-in workflows for coding agents (Claude, Codex, etc.). Each
skill is a self-contained folder headed by a `SKILL.md`; an agent reads it,
follows the workflow, and produces the result. There is no build step and no
runtime — packages are plain text, installed by copying a folder.

This repo is the **public discovery/installation surface only**. It is not a
mirror of any private skills directory; private candidate data, job ledgers,
source footage, credentials, customer data, personal notes, and
machine-specific config always stay outside it (see `CONTEXT.md`).

Canonical repository rules live in `AGENTS.md` — read it first. Full inventory
with per-skill dependencies/status is in `SKILLS.md`.

## Repository structure

Skill packages are organized into category subfolders (`dev-skills/`, `hustle-skills/`,
`studio-skills/`, 14 total). A package may contain only: `SKILL.md` (required),
`README.md`, `agents/`, `scripts/`, `references/`, `assets/`, `tests/`.
Nothing else is allowed at the repo root besides `dev-skills/`, `hustle-skills/`, `studio-skills/`,
`scripts/`, `.github/`, and the required root docs (`README.md`, `LICENSE`,
`AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `CONTEXT.md`, `SKILLS.md`).

The root `scripts/` directory holds the repo's own tooling (validator,
installer, lister, tests) — distinct from a skill's own `scripts/` subfolder.

## Commands

```bash
# Validate the whole contract (layout, naming, text-only rule, no home paths,
# no secrets, inventory matches folders) — run before proposing any change
python3 scripts/validate-skills.py .

# Repository-tooling unit tests (installer/validator fixtures)
python3 scripts/test_repository_tools.py

# List every installable skill in this checkout
python3 scripts/list-skills.py --format table

# Install one skill into a destination skills directory (copy-only, additive,
# refuses to overwrite an existing target, refuses symlinked sources)
python3 scripts/install-skill.py dev-skills/security-check --dest "$HOME/.claude/skills"

# Per-skill test suites (not all skills have one; these two do)
python3 hustle-skills/job-hunter/scripts/test_job_hunter.py
python3 hustle-skills/linkedin-process-share/scripts/test_build_review_packet.py

# Zero-token regex security scan (must show no 🔴 HIGH findings)
python3 dev-skills/security-check/scripts/security_scan.py .
```

CI (`.github/workflows/validate-skills.yml`) runs all of the above on every
PR and push to `main`, plus an installer smoke test (install once, confirm a
second install to the same target fails). A red CI run almost always means
one of: a package's frontmatter `name` doesn't match its folder name, a stray
file exists at repo root, a home path or private-content pattern got
committed, or the `SKILLS.md` inventory table is out of sync with the actual
folders.

## The package contract (enforced by `validate-skills.py`)

- Frontmatter is **exactly** `name` + `description`, and `name` must equal the
  package's directory name (kebab-case, unique across the repo).
- Text-only: every tracked file must be UTF-8 and either a required root doc
  or have a suffix in `{.md, .py, .yaml, .yml, .sh, .txt}` — no binaries, no
  vendored media, no lockfiles.
- No symlinks anywhere in the tree.
- No absolute `/Users/...` or `/home/...` paths, no flagged private-content
  phrases, no plausible hardcoded secret/token values (a few safe-context
  patterns — `os.environ`, `<placeholder>`, regex literals — are allowed).
- `SKILLS.md`'s inventory rows must exactly match the set of package
  directories (one row per package, each with non-empty status/dependencies/
  notes columns).

When adding or renaming a skill: create/rename the folder at repo root, keep
its `SKILL.md` frontmatter `name` in sync, add a `SKILLS.md` row, and rerun
the validator before committing.

## Publishing boundary

This repo publishes **workflows**, not actions. `linkedin-process-share` and
`job-hunter` in particular are structured so that drafting/reviewing is
in-repo, but publishing, sending, applying, or editing an external profile
always requires a separate, explicit approval step defined by that skill —
never assume a draft is authorization to act.
