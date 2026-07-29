# Time Machine Skills

Ten agent skills for [Claude Code](https://claude.com/claude-code) and Codex. Each one takes a task
you do by hand and gives you the time back.

They are not prompt templates. Each skill is a written procedure the agent follows, and
several ship real scripts that run with no LLM tokens at all.

An eleventh, [`job-hunter`](https://github.com/iampon-p/job-hunter), lives in its own
repository.

---

## Install

Skills live in `~/.claude/skills/`. Copy in the ones you want:

```bash
git clone https://github.com/iampon-p/skills.git time-machine-skills
cp -r time-machine-skills/security-check ~/.claude/skills/
```

Restart Claude Code. The skill is then available as `/security-check`.

Install all ten:

```bash
cp -r time-machine-skills/*/ ~/.claude/skills/
```

`job-hunter` installs the same way from its own repository:

```bash
git clone https://github.com/iampon-p/job-hunter.git
cp -r job-hunter ~/.claude/skills/
```

---

## The skills

| Skill | What it saves you | Needs setup? |
|---|---|---|
| [`security-check`](security-check/) | Scans code for hardcoded secrets and dangerous patterns before you push. **Zero LLM tokens** — pure regex, standard library only. | No |
| [`diagnose`](diagnose/) | A discipline for hard bugs: reproduce → minimise → hypothesise → instrument → fix → regression-test. Stops the guess-and-check spiral. | No |
| [`design-an-interface`](design-an-interface/) | Generates several genuinely different designs for the same module in parallel, then compares them. From *"Design It Twice"* in *A Philosophy of Software Design*. | No |
| [`qa`](qa/) | You describe bugs in plain language; it explores the codebase for context and files GitHub issues in the project's own vocabulary. | `gh` CLI |
| [`caveman`](caveman/) | Strips filler from every reply. Cuts token use roughly 75% with no loss of technical detail. | No |
| [`skill-creator`](skill-creator/) | Scaffolds a new skill — and first checks whether an existing skill should just be extended instead. | No |
| [`sumup`](sumup/) | Closes out a session: what happened, what broke, what fixed it, plus a handoff prompt so the next session starts where this one stopped. | Optional `$VAULT` |
| [`today-obsidian`](today-obsidian/) | Builds today's task list by carrying forward unfinished work from yesterday's notes and your git history. Idempotent — safe to re-run. | `$VAULT` |
| [`fixbill`](fixbill/) | Fixes addresses, dates and invoice numbers on Thai and English PDF invoices. | [fixbill-cli](https://github.com/iampon-p/fixbill-cli) |
| [`edit-video`](edit-video/) | Turn raw footage into captioned, music-backed vertical reels. Cut clips to music beats, transcribe speech, render final MP4 + cut-list. | `ffmpeg`, `mlx-whisper` (Apple Silicon) |
| [`job-hunter`](https://github.com/iampon-p/job-hunter) | *(separate repository.)* Finds and scores jobs, prepares truthful applications, drives browser-based forms, and tracks outreach and follow-ups with approval gates. | Agent Browser; Playwright and email connector optional |

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
