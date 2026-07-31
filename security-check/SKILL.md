---
name: security-check
description: Run a security scan on a file or directory for hardcoded secrets, dangerous code patterns, and tech debt markers. Use when the user invokes /security-check, before committing code, after writing a new script, or when reviewing a PR. Zero LLM tokens — pure regex scan.
---

# Security Check

Runs the bundled `scripts/security_scan.py` on a given path and reports findings.

## Usage

```
/security-check [path]
```

If no path given, scan the last file modified or ask the user which file to check.

## Step 1 — Run scanner

```bash
python3 "$CLAUDE_SKILL_DIR/scripts/security_scan.py" "<path>"
```

If `$CLAUDE_SKILL_DIR` is not set, use the path to this skill's folder, e.g. `~/.claude/skills/security-check/scripts/security_scan.py`.

## Step 2 — Interpret results

Severity levels:
- 🔴 HIGH — must fix before push (hardcoded secrets, dangerous patterns)
- 🟡 MEDIUM — should fix (os.system, TODO/FIXME, HTTP URLs)
- ⚪ LOW — optional (debug prints, commented code)

## Step 3 — Report

If HIGH findings: tell the user what they are and where (file:line), suggest fix.
If MEDIUM/LOW only: briefly list them but note they're not blocking.
If clean: "✅ No security issues found in <path>"

## Telegram alerts

HIGH findings may trigger a Telegram alert if local-only Telegram env vars are
configured. Do not hardcode chat IDs or bot tokens in this repo.
