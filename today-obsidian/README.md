# today-obsidian

Builds your daily cockpit note in Obsidian by carrying forward unchecked tasks and computing priorities.

## What it does

Reads from 5 fixed sources (yesterday's daily note, handoff files, skill loop tracker, focus hub, today's journal) and builds today's note with: a one-line status summary (done/in-progress/carried counts), a project priorities section, carried-over tasks marked stale if rolling 3+ days, and a project staleness check. Additive and idempotent — safe to re-run same day without duplicating or erasing your own scribbles. Classifies each carried task by reading terminal activity (git commits, session transcripts) to mark what's actually done vs still in progress.

## Example

**You type:**
```
/today-obsidian
```

**What happens:**

1. Finds yesterday's daily note. Reads all unchecked `- [ ]` tasks.
2. Checks handoff files, skill tracker, focus hub for new items.
3. Reads git commits since yesterday to see which tasks were actually completed.
4. Writes `Personal/daily/29-07-2026.md`:
   ```
   Status: 7 tasks — 2 done · 1 in progress · 4 carried (1 ⚠️stale)

   ## Project Priorities
   ### spy
   Summary: 3 tasks, top P1 via /skill-improve
   #### /skill-improve
   - [x] P1 · required · Agent — Fix mobile LINE video PII blur — shipped (a2f3e4)

   ## Carried Tasks
   - [ ] P2 · optional · You — Re-run desktop guide (income/create-new-customer) (since 27-07-2026)
   - [ ] P3 · optional · Agent — Marker-Style CLAUDE.md alignment (since 24-07-2026)
   - [/] P1 · required · Agent — FIX Mobile LINE Video PII Blur (since 27-07-2026) — in progress: reviewing PR
   - ⚠️ [ ] P2 · required · You — Carry yesterday's task (since 26-07-2026)
   ```
5. Marks tasks done if git commits or transcripts prove they're finished.
6. Flags projects that should be archived (reads Obsidian project notes for status).

## Setup

Requires `$VAULT` environment variable pointing to your Obsidian vault (e.g. `~/Obsidian Vault`). Optional `$ACTIVE_REPOS` (default `~/work/active`) for git-activity signals. If vault doesn't exist, skill prints summary to terminal only.

## Install

```bash
cp -r today-obsidian ~/.claude/skills/
```
