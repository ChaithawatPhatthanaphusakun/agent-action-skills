<div align="center">

# 🧰 Agent Action Skills

**A curated, public-safe library of portable agent skills.**

Drop-in workflows for coding agents — each one a self-contained folder you can install into any agent's skills directory in a single command.

[![License: MIT](https://img.shields.io/badge/License-MIT-informational.svg)](LICENSE)
![Skills](https://img.shields.io/badge/skills-7-success.svg)
![Text only](https://img.shields.io/badge/packages-audited-blue.svg)
![Public safe](https://img.shields.io/badge/privacy-public--safe-brightgreen.svg)

</div>

---

## What this is

Every skill is a **portable folder headed by a `SKILL.md`** — no build step, no runtime, no lock-in. An agent reads the `SKILL.md`, follows the workflow, and produces the result.

Three rules make the whole collection safe to publish and safe to install:

- **Audited contract** — no vendored media outside a small allow-listed set (fonts/images/JS-TS), no secrets, no home paths. A validator enforces it.
- **Additive install** — the installer copies into an explicit destination, never overwrites, never symlinks, never deletes.
- **Public/private boundary** — personal data, customer material, and private paths live outside the repo. See [CONTEXT.md](CONTEXT.md).

## Quick start

```bash
git clone https://github.com/ChaithawatPon/agent-action-skills.git
cd agent-action-skills

# Install one skill into your agent's skills directory
python3 scripts/install-skill.py sumup --dest "$HOME/.claude/skills"

# See everything available
python3 scripts/list-skills.py
```

The installer refuses to overwrite an existing destination — so it can never clobber a skill you already have.

## The catalog

| Skill | What it does |
| --- | --- |
| [`skill-creator`](skill-creator) | Scaffold a new, correctly-structured skill package |
| [`sumup`](sumup) | Wrap up a work session into a clean handoff + next-step summary |
| [`today-obsidian`](today-obsidian) | Build a daily "cockpit" note that carries forward open tasks |
| [`job-hunter`](job-hunter) | Find, evaluate, tailor, apply, and follow up — driven by verified resume evidence and a private ledger |
| [`edit-video`](edit-video) | Cut raw clips, add captions, mix music, render a vertical reel via a local ffmpeg pipeline |
| [`fixbill`](fixbill) | Correct addresses, dates, and numbers on PDF invoices/receipts (Thai-aware) |
| [`social-update`](social-update) | Consolidated social content, copywriting, marketing, and video production |

Full inventory with dependencies in [SKILLS.md](SKILLS.md).

## Design principles

Each package is **portable** (copy the folder, it works), **audited** (allow-listed file types only, checked at a glance), and **agent-agnostic** (works with any agent that reads `SKILL.md`). The contract is machine-checked:

```bash
python3 scripts/validate-skills.py .
```

The validator enforces the folder layout, naming, allow-listed suffix rule, and the absence of home paths — so a bad package can't merge.

## Contributing

New skills are welcome if they hold the line: allow-listed file types only, no personal or customer data, no private paths, no credentials, no unreviewed third-party work. Run the validator before opening a PR — CI runs it too.

## License

[MIT](LICENSE). Reuse freely; keep it clean.
