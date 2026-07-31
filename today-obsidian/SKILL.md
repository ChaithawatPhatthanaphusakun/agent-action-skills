---
name: today-obsidian
description: >-
  Use when the user invokes /today-obsidian, or asks "what's on today", "what should I do today", "carry yesterday's tasks", or wants a daily cockpit note. Builds/updates today's Obsidian daily note by carrying forward unchecked tasks from fixed sources into structured required/optional task lines with priority, owner, source, next action, blocker, a refreshed project-priority view, and a one-line computed status summary. Additive and idempotent: safe to re-run same day without duplicating or wiping the user's own scribbles.
---

# /today-obsidian

Builds the user's daily cockpit note in Obsidian: what's carried over, what's stale, what's the
focus. Source-computed only — never depends on chat history, so it reads the same whether
run cold at 9am or after a work session. (For a narrative "what did we just do" recap, that's
`/recap` — different job.)

**Vault:** `$OBSIDIAN_VAULT` (locally configured; fallback:
`$VAULT`).
**Output:** `$OBSIDIAN_VAULT/Personal/daily/DD-MM-YYYY.md` (today's date) — primary, always
written. Plus an optional secondary `$OBSIDIAN_VAULT/Personal/daily/DD-mm-yyyy-<topic>-fix.md`
(Step 2g) — only written when the user names a topic/fix focus.
**Bundled script:** `scripts/git_activity.py` — read-only git-commit digest across
`$ACTIVE_REPOS/*` repos, used as terminal-activity signal in Step 2c.

## Design decisions (locked via grilling, 16-07-2026)

1. **Fixed 5 sources only** — never a vault-wide scan. Vault-wide `grep` for `- [ ]` drags in
   old project notes/templates/junk; the cockpit becomes noise, the exact clutter this skill
   exists to escape.
2. **Stale flag ≥3 days** — a carried task that's been rolling for 3+ days gets `⚠️stale` so
   the user consciously kills or does it, instead of silently carrying forever (task graveyard).
3. **Daily note = shared-doc exception** to the human/AI note-split rule
   ([[Human/AI Note Split]] memory). It's a cockpit both of you touch, not a thinking note.
   Guardrail: the skill only ever appends/updates its own sections (Carried Tasks, Focus,
   status line) — it never rewrites or deletes a line the user wrote himself.
4. **Structured generated tasks are required** — every task the skill writes must be
   decision-ready, not a loose reminder. A generated top-level task must carry compact metadata:
   priority (`P1`/`P2`/`P3`), requirement (`required`/`optional`), owner (`You`/`Agent`/`Team`),
   source, next action, and blocker. If a field is unknown, write `unknown` or `none`; do not
   invent certainty. Keep the task text itself short enough to scan.
5. **Additive re-run, manual trigger only** — no cron/launchd. First run of the day creates
   the note. Re-runs re-read the 5 sources and only add newly-appeared tasks / refresh the
   status line; matching is by task text, so an already-present task (checked or unchecked)
   is skipped, never duplicated or re-added. If the user edited a carried task's wording, the skill
   can't match it and may add a near-duplicate — acceptable, rare, just delete the dup.
6. **Roll-forward marking (anti-graveyard)** — a carried task lives in exactly one place:
   today. In the *source* daily note, the skill rewrites that line to
   `- [>] rolled → [[DD-MM-YYYY]]`. Each carried task keeps an origin tag `(since DD-MM-YYYY)`
   through every roll, so staleness = `today − since ≥ 3 days`, computed correctly no matter
   how many days it's hopped. Write-back applies **only** to daily notes — `hand-off/`,
   `Skill Loop-Test Tracker.md`, `Focus-hub.md`, `Personal/Journal/` are read-only references
   and are never rewritten.
7. **Carry-list + staleness stay source-computed; status is terminal-activity-derived**
   (revised 18-07-2026). The *set* of carried tasks and their stale flags are still computed
   only from the 5 sources — deterministic, no narrative. But each carried task is now also
   **classified done / in-progress / carried** by reading terminal activity (Step 2c), and the
   summary line carries those counts. This is a status label, not a narrative — no "what we
   did" prose (that's still `/recap`'s job). If no terminal activity is readable, every carried
   task falls back to `carried`, so the run stays deterministic.
8. **Journal is today's-own-entry only, never rewritten** — `Personal/Journal/DD-MM-YY.md` is
   the user's raw personal scratch note (2-digit-year filename, distinct from the daily cockpit
   note's 4-digit-year filename). Only *today's* journal entry is read, never older ones (no
   backward walk like source 1 — the journal isn't a carry-forward list, it's a same-day
   brain-dump). Fold it into the cockpit as a short summary + link back to the raw note —
   never copy/rewrite the user's raw journal text verbatim into the cockpit's own voice, per the
   vault's raw-text-preservation convention.

9. **Git commits are a terminal-activity source, alongside session transcripts** (added
   20-07-2026, matching `/daily-standup`'s gather.py pattern). `scripts/git_activity.py`
   discovers repos under `$ACTIVE_REPOS/*/` (the active/archive convention) plus any extra
   repo cwd found from session scans, and prints `git log --all --since=<cutoff>
   --author=<git user.email> --no-merges`, hash-deduped across repos. This is read-only signal
   for Step 2c classification — it never writes to git or the vault. If `$ACTIVE_REPOS`
   doesn't exist or has no repos, this source is empty and Step 2c falls back to
   session-transcript-only, same graceful-degradation rule as decision 7.
10. **Stale active-project flag is Obsidian-status-driven, not mtime-driven** (added
    20-07-2026). For each `$ACTIVE_REPOS/<project>/`, the skill looks for a matching Obsidian
    project note (see Step 2f for the resolution rule) and reads its status — frontmatter
    `status:` field first, else a scan of the note's first ~20 lines for explicit keywords
    (`archived`, `deprecated`, `paused`, `done`, `superseded`, `merged into`, `no longer
    active`). Filesystem mtime is never used as a staleness signal — a quiet repo isn't
    evidence of anything; an Obsidian note saying "archived" is. No matching note, or a note
    with no status signal, means no claim — skip silently, don't guess. This is a **suggestion
    only** (`consider archiving: <project>`); the skill never moves files between active and
    archive directories itself.
11. **A second, optional output — the "fix log" — exists alongside the daily cockpit note**
    (added 20-07-2026, mirrors `Personal/Follow up miss task.md`'s shape). It is NOT a
    replacement for `Personal/daily/DD-MM-YYYY.md` — that filename and its 5-source machinery
    stay exactly as-is (decisions 1–9 all still apply; other skills — `fixbill`, `sumup` —
    depend on that exact filename). The fix log is a separate, explicitly-requested artifact
    for when the user wants a running "what got fixed on `<topic>`" log in the nested-checklist
    style, not the structured-metadata style. See Step 2g. **Open ambiguity, flagged not
    guessed:** what exactly fills `<topic>` when the run touches several projects, and whether
    the user eventually wants this folded into the main cockpit note instead of staying separate —
    both need the user's call; current behavior defaults to per-run explicit topic or `daily`.

12. **Project Priorities is a generated derived view** (locked 19-07-2026). The skill writes a
   `## Project Priorities` section above `## Carried Tasks` and refreshes the whole section on
   every run. This section groups tasks primarily by project/topic, then nests slash aliases as
   workflow/type markers. It is derived from the normalized generated tasks, so rewriting it is
   allowed; user-written sections and raw source notes remain untouched. Project/topic comes from
   an explicit alias map first, then fallback inference. Wrapper aliases such as `/skill-improve`
   group under the target project when a known target is detectable (for example, `/skill-improve
   spy` -> `spy`), and fall back to `skill-system` only for generic maintenance.

## Configuration

Define these paths before running the skill:

- **`$VAULT`** (required) — Your notes directory. Default: `~/notes`. Set this to your
  Obsidian vault path if you use Obsidian (e.g., `~/Obsidian Vault`).
  - If `$VAULT` does not exist, the skill **stops** with a one-line error message telling you
    to set `$VAULT`. It does not create any directories.

- **`$ACTIVE_REPOS`** (optional) — Directory holding your in-progress repos. Default:
  `~/work/active`.
  - If unset or the directory does not exist, the git-activity signal (Step 2c) is skipped.
    Every carried task stays classified as `carried`, but the run still succeeds — all other
    steps run normally.
  - Session-transcript sources (Claude Code and Codex) are best-effort and work independently
    of `$ACTIVE_REPOS` if they exist.

## Step 0 — Locate sources

```bash
VAULT="$OBSIDIAN_VAULT"   # locally configured; fallback: "$VAULT"
TODAY=$(date +%d-%m-%Y)
TODAY_NOTE="$VAULT/Personal/daily/$TODAY.md"

# Walk back from yesterday until a daily note exists (covers skipped days).
# Exclude today's own note explicitly -- on a same-day re-run, today's note
# already exists and would otherwise win the sort, collapsing the window to
# zero and breaking every "since last note" computation downstream (Step 1
# staleness, Step 2c git SINCE).
LAST_NOTE=$(find "$VAULT/Personal/daily" -maxdepth 1 -name '[0-3][0-9]-[0-1][0-9]-20[0-9][0-9].md' \
  ! -name "$TODAY.md" | sort -t- -k3,3 -k2,2 -k1,1 | tail -1)   # most recent note before today
```

`$LAST_NOTE` is the exact source-1 file from here on — every later step (Step 1's carry loop,
Step 2c's git `SINCE`) reads it from this one variable, never re-derives it.

Five fixed sources — nothing else:

1. **Most recent daily note** (found above) → every unchecked `- [ ]` line.
2. **`hand-off/`** — walk `hand-off/*/*/*/handoff.md` (dated) and `hand-off/*/*.md` (flat,
   legacy) for entries whose parent index (e.g. `MEMORY.md`'s "Active handoffs" note, or the
   handoff's own "Still open" section) marks them on-the-list / next-step.
3. **`Claude/Skill Loop-Test Tracker.md`** — table rows where Status ≠ ✅ and ≠ ➖.
4. **`Personal/daily/Focus-hub.md`** — top priority item (read only, don't parse deeply).
5. **`Personal/Journal/DD-MM-YY.md`** (today's date only, 2-digit year) — the user's same-day raw
   scratch note, if one exists. Read only; never walk backward to older journal entries.

## Step 1 — Carry tasks (source 1: last daily note)

For each unchecked `- [ ]` line in the last daily note:

- If it already carries a `(since DD-MM-YYYY)` tag, keep the tag as-is.
- If it doesn't, this is its first carry — tag it `(since <last note's date>)`.
- Compute staleness: `today − since ≥ 3 days` → prefix `⚠️stale`.
- Rewrite the line **in the source note** to `- [>] rolled → [[<TODAY>]]` (write-back only
  ever touches daily notes — never hand-off/tracker/focus-hub).

If today's note already has this task (match on task text, ignoring the tag/stale prefix),
skip adding it again — but still perform the roll-forward write-back in the source note so it
isn't left as a stale open box there.

## Step 2 — Pull references (sources 2–4, read-only)

- Hand-off "on the list" items → list as `- [ ] <item> (hand-off: <project>/<task>)`.
- Tracker rows not ✅/➖ → list as `- [ ] loop-test: <skill> (<status>)`.
- Focus-hub top item → one line, no parsing beyond the top entry.

Never rewrite these three sources.

## Step 2b — Pull today's journal (source 5, read-only)

```bash
TODAY_2Y=$(date +%d-%m-%y)
JOURNAL_NOTE="$VAULT/Personal/Journal/$TODAY_2Y.md"
```

If `$JOURNAL_NOTE` exists:

- Summarize its content into a short bullet list of actionable items (skill ideas, follow-ups,
  decisions) — condense, don't verbatim-copy the user's raw phrasing into the cockpit's voice.
- Add a `## From Journal (<TODAY_2Y>)` section with a `Raw: [[Personal/Journal/<TODAY_2Y>]]`
  link at the top, then the summarized bullets as `- [ ]` items.
- Match by summarized-bullet text on re-run, same as other sources — don't re-add or duplicate.

If it doesn't exist, skip this section entirely (don't create an empty header).
Never rewrite the journal note itself.

## Step 2c — Classify status from terminal activity

Read recent terminal / agent-session activity to label each carried task (Step 1 output) as
**done**, **in progress**, or **carried** (untouched). Sources of terminal activity, in order:

1. **The running agent's own session**, when the skill is invoked live inside a work session —
   use what was actually done this session.
2. **Latest Claude Code session transcript(s)** — newest first under
   `~/.claude/projects/*/` (or the platform's session store).
3. **Latest Codex session(s)** — newest first under `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`.
4. **Git commits across active repos** (matches `/daily-standup`'s gather.py pattern — decision
   9) — run:
   ```bash
   SINCE=$(date -j -f '%d-%m-%Y' "$(basename "$LAST_NOTE" .md)" +%Y-%m-%d 2>/dev/null || echo "$TODAY")
   SCRIPT_PATH="${CLAUDE_SKILL_DIR:-~/.claude/skills/today-obsidian}/scripts/git_activity.py"
   python3 "$SCRIPT_PATH" --since "$SINCE"
   ```
   If `$CLAUDE_SKILL_DIR` is unset, the skill folder's own path is used as the fallback.
   `SINCE` = the last daily note's date (source 1's cutoff), so git activity covers the same
   window as the carried tasks it's meant to help classify. A commit whose message/diff plainly
   matches a carried task's deliverable is strong "done" evidence — on-disk and unambiguous by
   construction (a real commit hash), stronger than a transcript claim.

Classify conservatively and verify against the on-disk result, not just claims in the log:

- **done** — the task's concrete deliverable is finished and verified (committed/pushed/deployed,
  file written, decision made). Rewrite its checkbox to `- [x]` and append a terse ` — <what
  shipped>` note (no narrative). A matching git commit hash may be cited in the note, e.g.
  ` — shipped (a2f34e6)`.
- **in progress** — started but not finished. Rewrite to `- [/]` and append ` — <state>`.
- **carried** — no matching terminal activity → leave as `- [ ]`.

Match tasks to activity by meaning, not exact text. When unsure, prefer the lower status
(carried over in-progress, in-progress over done) — never mark done on a claim you can't verify
on disk. If **no** terminal activity is readable (including no git repos found under
`$ACTIVE_REPOS/`), skip this step: every carried task stays `carried` and the run is fully
deterministic.

## Step 2d — Normalize generated tasks

Every task written by this skill must use this structure:

```md
- [ ] P1 · required · Agent — Fix short task title (since DD-MM-YYYY)
  - Source: [[source note]] or `/absolute/path`
  - Next: one concrete next action
  - Blocked: none
```

Rules:

- Preserve status markers from Step 2c: `- [ ]`, `- [/]`, or `- [x]`.
- Priority:
  - `P1` = should be considered today or blocks active work.
  - `P2` = important but not today's first focus.
  - `P3` = optional/later cleanup.
- Requirement:
  - `required` = needed to complete an active workflow or avoid drift.
  - `optional` = nice-to-have, cleanup, or future polish.
- Owner:
  - `the user` = needs the user's login, grading, typing, permission, or decision.
  - `Agent` = the agent can do it alone.
  - `Team` = another team or person is the blocker.
- Source must point to the note/path that produced the task.
- Next must be a single action, not a mini-plan.
- Blocked must be `none` or the concrete blocker.
- Existing older loose tasks may remain untouched unless the skill owns the section and is
  already updating that task's generated line. New generated tasks must use the structure.
- Match/dedupe by the short task title after removing checkbox, priority, requirement, owner,
  stale prefix, and `(since ...)`.

## Step 2e — Build Project Priorities

After Steps 2–2d have produced the normalized generated task set, build a derived
`## Project Priorities` section. This is not an additional source; it is a refreshed view of
the same generated tasks.

Output shape:

```md
## Project Priorities

### <project/topic>
Summary: <N> task(s), top <P1/P2/P3> via /alias - <top task title>
#### /alias
- [ ] P1 · required · Agent — Short task title
  - Next: one concrete next action
  - Blocked: none
```

Grouping rules:

- Primary group: project/topic.
- Secondary group: slash alias/type, written as `#### /alias`.
- Project/topic is chosen from an explicit alias map first, then fallback inference from task
  title, source path, handoff path, tracker row, or Focus-hub item.
- Wrapper aliases such as `/skill-improve` do not automatically define the project. If a known
  target project/skill is detectable in the task text or source, group under that target (for
  example, `/skill-improve spy` -> `spy`; `/skill-improve today-obsidian` ->
  `today-obsidian`). If no target is detectable, group under `skill-system`.
- Keep a small explicit default map in the skill logic/run notes and extend it when a recurring
  alias appears. Initial defaults:
  - `/spy` -> `spy`
  - `/today-obsidian` -> `today-obsidian`
  - `/blog-writing` -> `content`
  - `/screenshot-guide` -> `content`
  - `/video-doc-guide` -> `content`
  - `/edit-video` -> `content`
  - `/fixbill` -> `billing-docs`
  - `/uni-assignment` -> `uni`
- Sort projects by strongest unfinished priority (`P1` before `P2` before `P3`), then by stale
  count, then alphabetically. Inside each project, sort unfinished tasks before done tasks, then
  by priority.
- The section is owned by the skill: on re-run, refresh the entire `## Project Priorities`
  section from the current generated task set. Never edit user-written sections.

## Step 2f — Flag stale active projects (Obsidian-status-driven, decision 10)

```bash
ls -d "$ACTIVE_REPOS"/*/ 2>/dev/null
```

For each `$ACTIVE_REPOS/<project>/`:

1. Resolve a candidate Obsidian project note, in order, stop at first hit:
   - `$VAULT/Work/<Project>.md` (exact/case-insensitive name match)
   - `$VAULT/Work/<Company>/<Project>*.md` (company sub-projects often live nested — see the
     alias map in Step 2e; e.g. a repo named `acme-game` may map to `Work/Acme/game/` or
     `Work/Acme/Game Hub.md`, and `acme-skills`/`acme` to `Work/Acme/*` generally)
   - `$VAULT/Work/<Project>/` (a directory of notes — check for an index/overview note inside,
     e.g. `Project Overview.md`)
2. If no candidate note is found, skip this project silently — no note, no claim.
3. If found, read status:
   - Frontmatter `status:` field, if present (`archived`, `paused`, `done`, `deprecated`, etc.)
   - Else scan the first ~20 lines for the same keywords in prose.
4. If status indicates the project is no longer active, add one line to the note's stale-flag
   list: `- consider archiving: <project> (per [[<Obsidian note>]]: "<status text>")`.
5. If the note has no status signal either way, skip — don't infer from mtime, silence, or
   staleness of unrelated content.

This step is best-effort and depends on project notes actually carrying a status signal, which
most don't yet (checked 20-07-2026: no `Work/*.md` uses a consistent `status:` frontmatter
field today). Flag this gap to the user rather than inventing a convention — see report notes.

## Step 2g — Build the fix log (optional secondary output, decision 11)

Only run this step when the user's invocation names an explicit topic (e.g. "today-obsidian fix
video-doc-guide", "/today-obsidian topic:spy") or the prompt otherwise makes a specific
fix/topic focus obvious. Do **not** run it on a bare `/today-obsidian` — that stays exactly the
Step 0–5 flow against `Personal/daily/DD-MM-YYYY.md` only, unchanged.

```
TOPIC="<slug of the named topic, or the single dominant P1 project from Step 2e if only one>"
FIX_NOTE="$VAULT/Personal/daily/$(date +%d-%m-%Y)-${TOPIC}-fix.md"
```

Shape mirrors `Personal/Follow up miss task.md` (reference read 20-07-2026):

```md
<!-- today-obsidian:owned:session-log:start -->
## Session summary — <D-M-YY> <topic> <key:abc1234+def5678>

- <this run's factual delta only: commits shipped (cite hash), files changed, decisions made —
  pull from Step 2c's git/session evidence, never speculation>
<!-- today-obsidian:owned:session-log:end -->

---

<!-- today-obsidian:owned:note-tree:start -->
# Note
- [ ] <Project>
  - [ ] <task>
    - <progress sub-bullet, link as [[wikilink]] or absolute path>
<!-- today-obsidian:owned:note-tree:end -->
```

Ownership rule, to preserve decision 3's "never wipe the user's scribbles" guarantee: the skill only
ever writes *inside* the two marker pairs above.

- `session-log` block: **append-if-new, not blind append.** Each entry carries a dedup key —
  the sorted, comma-joined short hashes of the git commits this run's summary is built from
  (from `git_activity.py`'s output), or `no-new-commits:<D-M-YY>` when no commits fell in the
  window. Before writing, compute this run's key and check it against every existing entry's
  `<key:...>` inside the block:
  - Key already present → this run produced nothing new since the last run touched this topic;
    do not append, do not edit the existing entry. (Matches decision 5's "skip, never
    duplicate" rule, applied to this block instead of task text.)
  - Key not present → append one new entry above the previous ones. Never edit or remove a
    prior entry.
  This makes two back-to-back runs with no new commits a no-op on this block, preserving the
  skill's idempotency guarantee — the same property Step 1/2d/2e already hold for the primary
  note.
- `note-tree` block: rendered from the same normalized generated tasks as Step 2e's Project
  Priorities (same data, checklist-visual style instead of metadata-line style) and refreshed
  in full on every run of this step, same as Project Priorities is in Step 2e. This block is
  idempotent by construction — a full rebuild from the same task set produces byte-identical
  output, not a duplicate.
- Anything the user writes outside the marker pairs in this file (his own scribbles, added between
  sessions) is never touched, exactly like the daily note.

If `$FIX_NOTE` doesn't exist yet, create it with both marker blocks. If it exists, append to the
session-log block and refresh the note-tree block, leaving everything else byte-identical.

**Open item for the user:** what exactly `<topic>` should be when a run spans multiple projects, and
whether this file should eventually replace or fold into the primary daily note rather than
staying separate — flagged, not decided here (decision 11).

## Step 3 — Compute the summary line

Carry-list + staleness are source-computed; the status counts come from Step 2c:

```
Status: <N> tasks — <D> done · <P> in progress · <C> carried (<M> ⚠️stale) · Sittings pending: <N> · Focus: <top Focus-hub item>
```

where `D + P + C = N`. If Step 2c was skipped, `D = P = 0` and `C = N`.

## Step 4 — Write/update today's note

If `$TODAY_NOTE` doesn't exist: create it with the summary line at top (Step 3, with status
counts), then a refreshed `## Project Priorities` section (Step 2e), then a `## Stale Project
Check` section (Step 2f output — omit the section entirely if Step 2f found nothing to flag,
same "don't create an empty header" rule as From Journal), then a `## Carried Tasks` section
(Step 1 output, with Step 2c checkbox status applied and Step 2d structure normalized), a
`## References` section (Step 2 output), and — if a journal entry exists — a `## From Journal`
section (Step 2b output) after References.

If it exists (re-run): refresh the summary line, refresh the entire `## Project Priorities`
section from Step 2e, refresh the entire `## Stale Project Check` section from Step 2f (add the
header if it's newly non-empty, remove it if it's now empty), apply Step 2c status changes to
the Carried Tasks checkboxes (`- [ ]` -> `- [x]`/`- [/]` for tasks now done/in-progress, plus
the terse ` — <note>`), normalize any generated task line the skill already owns when it touches
that task, and append any *newly matched* items from Steps 1, 2, and 2b to their sections using
Step 2d. The Project Priorities section, Stale Project Check section, Carried Tasks checkboxes,
and generated metadata are the skill's own — updating them is allowed. Never touch any line the user
wrote himself (his journal/thought sections, hand-picked notes).

If Step 2g ran (explicit topic/fix-mode invocation only), also write/update `$FIX_NOTE` per
Step 2g's marker-scoped rules. This is fully independent of the primary daily note — running it
never changes anything about `$TODAY_NOTE`'s own content or filename.

## Step 5 — Confirm

One short line back to the user: `✅ Today's note updated → Personal/daily/<TODAY>.md — <D> done · <P> in progress · <C> carried, <M> stale`. If any project was flagged in Step 2f, append ` · consider archiving: <project1, project2, ...>`. If Step 2g ran, add a second line: `✅ Fix log updated → Personal/daily/<TODAY>-<topic>-fix.md`.

## AUTO-RUN

If the prompt contains `AUTO-RUN`: skip all questions, run Steps 0–5 directly.
