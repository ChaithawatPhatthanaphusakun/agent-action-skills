# Time Machine Skills

Eight bundled agent skills for [Claude Code](https://claude.com/claude-code) and Codex, plus
four standalone projects. Each one takes a task you do by hand and gives you the time back.

They are not prompt templates. Each skill is a written procedure the agent follows, and
several ship real scripts that run with no LLM tokens at all.

Four larger skills—[`edit-video`](https://github.com/iampon-p/edit-video),
[`video-doc-guide`](https://github.com/iampon-p/video-doc-guide),
[`job-hunter`](https://github.com/iampon-p/job-hunter), and
[`fixbill-cli`](https://github.com/iampon-p/fixbill-cli)—live in their own public repositories.

---

## Install

Skills live in `~/.claude/skills/`. Copy in the ones you want:

```bash
git clone https://github.com/iampon-p/skills.git time-machine-skills
cp -r time-machine-skills/security-check ~/.claude/skills/
```

Restart Claude Code. The skill is then available as `/security-check`.

Install all eight bundled skills:

```bash
cp -r time-machine-skills/*/ ~/.claude/skills/
```

Standalone skills install from their own repositories:

```bash
git clone https://github.com/iampon-p/edit-video.git
git clone https://github.com/iampon-p/video-doc-guide.git
git clone https://github.com/iampon-p/job-hunter.git
cp -r edit-video ~/.claude/skills/
cp -r video-doc-guide ~/.claude/skills/
cp -r job-hunter ~/.claude/skills/
```

For Fixbill, follow the standalone project's [installation guide](https://github.com/iampon-p/fixbill-cli#readme).

---

## The skills

### Code

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`security-check`](security-check/) | Scans code for hardcoded secrets and dangerous patterns before you push. **Zero LLM tokens** — pure regex, standard library only. | No |
| [`diagnose`](diagnose/) | Reproduce → minimise → hypothesise → instrument → fix → regression-test. Stops the guess-and-check spiral. | No |
| [`qa`](qa/) | Turns plain-language bug reports into GitHub issues using the project's own vocabulary. | `gh` CLI |
| [`skill-creator`](skill-creator/) | Scaffolds a skill after checking whether an existing one should be extended. | No |

### Design

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`design-an-interface`](design-an-interface/) | Generates genuinely different designs for one module in parallel, then compares them. | No |

### Utilities

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`caveman`](caveman/) | Strips filler from every reply. Cuts token use roughly 75% without losing technical detail. | No |
| [`sumup`](sumup/) | Closes a session with results, failures, fixes, and a next-session handoff. | Optional `$VAULT` |
| [`today-obsidian`](today-obsidian/) | Builds today's task list from unfinished notes and Git history. | `$VAULT` |

### Media and documentation

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`edit-video`](https://github.com/iampon-p/edit-video) | **Standalone.** Turns raw footage into captioned, music-backed vertical reels. | `ffmpeg`, `mlx-whisper` |
| [`video-doc-guide`](https://github.com/iampon-p/video-doc-guide) | **Standalone.** Produces privacy-safe, evidence-driven product walkthrough videos. | Capture adapter and renderer |

### Career

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`job-hunter`](https://github.com/iampon-p/job-hunter) | **Standalone.** Finds and scores jobs, prepares truthful applications, drives forms, and tracks outreach. | Agent Browser; optional Playwright and email |

### Business

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`fixbill-cli`](https://github.com/iampon-p/fixbill-cli) | **Standalone.** Fixes addresses, dates, invoice numbers, and logos on Thai PDF invoices. | Follow project installation guide |

---

## Try one in 30 seconds

`security-check` needs nothing installed and runs standalone:

```bash
cat > canary.py <<'EOF'
import os
api_key = "sk_live_abcd1234efgh5678"
os.system("ls")
# TODO: fix this
EOF

python3 security-check/scripts/security_scan.py canary.py
```

```
🔍 Security scan: canary.py
  🔴 L2: [hardcoded_token] Hardcoded secret value
     api_key = "sk_live_abcd1234efgh5678"
  🟡 L3: [os_system] os.system() — prefer subprocess
     os.system("ls")
  🟡 L4: [todo_hack] Tech debt marker
     # TODO: fix this
```

No API key, no network, no dependencies.

---

## Configuration

Most skills need nothing. Two read a notes directory:

| Variable | Used by | Default | If missing |
|---|---|---|---|
| `$VAULT` | `sumup`, `today-obsidian` | `~/notes` | `sumup` prints to the terminal instead. `today-obsidian` stops and tells you to set it. |
| `$ACTIVE_REPOS` | `today-obsidian` | `~/work/active` | Git-activity signal is skipped; the run still succeeds. |

Skills that can publish, submit, or send data follow their own approval policy.

---

## Why these exist

I kept building a new skill instead of extending one I already had — 71 folders grown from
about 15 real ideas, and only a quarter of them ever used twice.

These are the ones that survived. Each is here because I reached for it again.

`skill-creator` now opens by asking whether an existing skill should be extended instead.
That check is the most useful thing in this repo.

---

## Notes

- Written as plain Markdown procedures that work with Claude Code and port to
  other agents with small changes. Skills with `agents/openai.yaml` also expose
  Codex UI metadata.
- `security-check` and `today-obsidian` ship Python scripts that use only the standard library.
- Everything here is mine. Skills adapted from other people's work were deliberately left out.

MIT licensed.
