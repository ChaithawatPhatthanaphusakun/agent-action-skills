# iampon-p Skills

A curated, public-safe collection of reusable agent skills. Each package is a
portable folder headed by `SKILL.md`; categories are organizational only.

## Install one skill

Clone this repository, then install an explicit skill into an explicit skills
directory. The installer refuses to overwrite an existing destination and never
uses symlinks or deletes files.

```bash
git clone https://github.com/iampon-p/skills.git
cd skills
python3 scripts/install-skill.py tools/security-check --dest "$HOME/.claude/skills"
```

List available install paths:

```bash
python3 scripts/list-skills.py
```

## Categories

| Category | Purpose |
| --- | --- |
| `tools` | Development, debugging, QA, security, skill authoring, and daily working workflows |
| `career` | Evidence-backed career workflows |
| `make` | Workflows that produce artifacts: video guides, edited video, document/PDF correction |

See [SKILLS.md](SKILLS.md) for the inventory and [CONTEXT.md](CONTEXT.md) for
the public/private boundary.

## Validate

```bash
python3 scripts/validate-skills.py .
```

The repository is MIT licensed. Do not add personal data, customer material,
private paths, credentials, or unreviewed third-party work.
