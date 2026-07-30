# Repository rules

This repository contains only reviewed, redistributable skill packages.

- Keep every installable package under a category and give it one `SKILL.md`.
- Keep frontmatter `name` equal to the package directory name; names are unique.
- Do not add symlinks, credentials, personal paths, private work logs, customer
  material, unpublished media, or machine-specific configuration.
- Treat public visibility as insufficient proof of redistribution rights.
- Use `scripts/validate-skills.py .` before proposing changes.
- Use `scripts/install-skill.py <category/skill> --dest <directory>` for local
  installs. It must fail rather than overwrite.
- Publishing, external messages, applications, and profile edits require the
  separate explicit approval defined by the relevant skill.
