<div align="center">

# 🧰 Skills

**A curated, public-safe library of portable agent skills.**

Drop-in workflows for coding agents — each one a self-contained folder you can install into any agent's skills directory in a single command.

[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
![Skills](https://img.shields.io/badge/skills-13-success.svg)
![Text only](https://img.shields.io/badge/packages-text--only-blue.svg)
![Public safe](https://img.shields.io/badge/privacy-public--safe-brightgreen.svg)

</div>

---

## What this is

Every skill is a **portable folder headed by a `SKILL.md`** — no build step, no runtime, no lock-in. An agent reads the `SKILL.md`, follows the workflow, and produces the result. Categories (`dev` / `hustle` / `studio`) are organizational only; nothing depends on them at runtime.

Three rules make the whole collection safe to publish and safe to install:

- **Text-only** — no binaries, no vendored media, no secrets. A validator enforces it.
- **Additive install** — the installer copies into an explicit destination, never overwrites, never symlinks, never deletes.
- **Public/private boundary** — personal data, customer material, and private paths live outside the repo. See [CONTEXT.md](CONTEXT.md).

## Quick start

```bash
git clone https://github.com/iampon-p/skills.git
cd skills

# Install one skill into your agent's skills directory
python3 scripts/install-skill.py security-check --dest "$HOME/.claude/skills"

# See everything available
python3 scripts/list-skills.py
```

The installer refuses to overwrite an existing destination — so it can never clobber a skill you already have.

## The catalog

### 🛠️ `dev` — build, debug, ship

| Skill | What it does |
| --- | --- |
| [`diagnose`](diagnose) | Disciplined debugging loop: reproduce → minimise → hypothesise → fix → regression-test |
| [`qa`](qa) | Turn conversational bug reports into durable, well-scoped GitHub issues |
| [`security-check`](security-check) | Zero-token regex scan for secrets, dangerous patterns, and tech-debt markers |
| [`design-an-interface`](design-an-interface) | Explore several radically different interface shapes before committing |
| [`skill-creator`](skill-creator) | Scaffold a new, correctly-structured skill package |
| [`sumup`](sumup) | Wrap up a work session into a clean handoff + next-step summary |
| [`today-obsidian`](today-obsidian) | Build a daily "cockpit" note that carries forward open tasks |
| [`caveman`](caveman) | Ultra-compact communication mode — ~75% fewer tokens, full technical accuracy |

### 🎯 `hustle` — evidence-backed career

| Skill | What it does |
| --- | --- |
| [`job-hunter`](job-hunter) | Find, evaluate, tailor, apply, and follow up — driven by verified resume evidence and a private ledger |
| [`linkedin-process-share`](linkedin-process-share) | Build an immutable, review-only preview of a LinkedIn post before it goes out |

### 🎬 `studio` — produce artifacts

| Skill | What it does |
| --- | --- |
| [`video-doc-guide`](video-doc-guide) | Privacy-safe product walkthrough videos with verified markers and captions |
| [`edit-video`](edit-video) | Cut raw clips, add captions, mix music, render a vertical reel via a local ffmpeg pipeline |
| [`fixbill`](fixbill) | Correct addresses, dates, and numbers on PDF invoices/receipts (Thai-aware) |

Full inventory with dependencies in [SKILLS.md](SKILLS.md).

## Design principles

Each package is **portable** (copy the folder, it works), **text-only** (auditable at a glance), and **agent-agnostic** (works with any agent that reads `SKILL.md`). The contract is machine-checked:

```bash
python3 scripts/validate-skills.py .
```

The validator enforces the folder layout, naming, text-only rule, and the absence of home paths — so a bad package can't merge.

## Contributing

New skills are welcome if they hold the line: text-only, no personal or customer data, no private paths, no credentials, no unreviewed third-party work. Run the validator before opening a PR — CI runs it too.

## License

[MIT](LICENSE). Reuse freely; keep it clean.
