---
name: sumup
description: Use when the user invokes /sumup or asks to summarize/wrap up the current session, "sum up this session", "what did we just do", or wants to close out a session before switching tasks. Produces a what/issue/fix/retrospective summary, saves a lesson to memory, saves a session note to Obsidian, updates project documentation (README, CLAUDE.md, AGENTS.md, skills, CONTEXT.md), and writes a handoff prompt so a fresh session can continue exactly where this one left off.
---

# /sumup

Wraps up the CURRENT terminal/Claude-Code session so nothing gets lost between sessions.
Distinct from `/recap` (cross-source weekly/daily progress report) and `/today-obsidian`
(forward-looking daily cockpit) — `/sumup` looks backward at only THIS session's
conversation, and its job ends with a paste-ready handoff for the next session.

Everything below is read from real evidence — the conversation transcript, `git diff`,
`git status`, and files actually touched this session. Never guess or invent work that
wasn't observed.

## Configuration

Define these paths before running the skill:

- **`$VAULT`** (required) — Your notes directory. Default: `~/notes`. Set this to your
  Obsidian vault path if you use Obsidian (e.g., `~/Obsidian Vault`).
  - If `$VAULT` does not exist, the skill **skips** note-saving and handoff-file steps. It
    will print the summary and handoff prompt to the terminal instead — it never creates
    directories outside `$VAULT` and never fails the run.

## Step 1 — What it did

Reconstruct concrete work done this session:

- Walk the conversation transcript for this session (what was asked, what tools ran, what
  was built).
- Cross-check against reality, don't trust the transcript alone:
  ```bash
  git status
  git diff --stat
  git log --oneline -10
  ```
- List: files created/changed, commands run, features/fixes shipped. Group by project if
  the session touched more than one.

## Step 2 — What the issue was

From the same transcript, pull out every bug, blocker, error, or dead end hit this session
(failed commands, wrong assumptions caught mid-session, permission blocks, tool errors,
things that needed a second attempt). If nothing went wrong, say so plainly — don't invent
friction to fill the section.

## Step 3 — How it got fixed

For each issue from Step 2, state the resolution actually applied. If something is still
open at end of session, mark it explicitly **unresolved** — do not imply it's fixed. This
list of unresolved items must also appear in the handoff (Step 7) so it isn't lost.

## Step 4 — Retrospective (save to memory)

Ask: "If I knew this at the start, what would I have done differently?" Keep this to
**surprising, non-obvious lessons only** — skip routine stuff ("read the file before
editing," normal debugging). Only worth writing if it would change how a future session
approaches similar work.

If there is a genuine lesson, save it to Claude's memory system:

1. Read 1-2 existing files in
   `~/.claude/projects/-Users-<your-user>/memory/` to confirm current
   format before writing (format can drift over time) — e.g.
   `feedback_full_output_paths.md`.
2. Create a new file in that same directory, named `feedback-<short-topic>.md` or
   `<short-topic>.md` (match the existing mix — `feedback_` prefix for corrections/lessons
   learned from the user, plain name for standalone project facts). Use this frontmatter shape
   exactly:
   ```markdown
   ---
   name: <kebab-case-slug>
   description: "<one-line, what this memory is and when it applies>"
   metadata:
     node_type: memory
     type: feedback
     originSessionId: <this session's id if known, else omit the field>
   ---

   <1-3 sentence statement of the lesson/fact>

   **Why:** <what happened this session that surfaced this, with date>

   **How to apply:** <concrete rule for future sessions — when this fires, what to do>
   ```
3. Add one index line to
   `~/.claude/projects/-Users-<your-user>/memory/MEMORY.md`, matching the
   existing bullet style: `- [Title](filename.md) — one-line summary`.

If there's no genuine surprising lesson this session, skip Step 4 entirely — don't force a
memory entry.

## Step 5 — Save a session note to Obsidian

Follow the AI Notes System convention:

- Pick the location by what the session's work was about:
  - Company project work → `$VAULT/Work/<Company>/<sub-area>/`
  - Other named project work → `$VAULT/Work/<project>/`
  - Claude/Codex operating notes, meta work on skills/tooling → `$VAULT/Claude/`
  - Personal/life admin → `$VAULT/Personal/`
- File name: short, dated, e.g. `<topic> — session summary DD-MM-YYYY.md`.
- Content: condensed version of Steps 1-4 (what/issue/fix/retrospective) — this is the
  durable record, keep it factual and skimmable, not a transcript dump.
- Never rewrite or overwrite an unrelated existing note — this is a new file per session
  unless the user says otherwise.

## Step 6 — Update project documentation

Update any project documentation files affected or modified by this session's work:

- **`README.md`**: Update build/run instructions, new scripts, or project description changes.
- **`CLAUDE.md` / `claude.md`**: Update project-specific guidelines, build/test commands, or workflow rules if conventions changed.
- **`AGENTS.md` / `codex.md`**: Update workspace or repository guidance for AI agents if new routing rules, subagent rules, or project boundaries were established.
- **`SKILL.md` / `skills.md`**: Update relevant skill files or skill documentation if skill behavior or usage instructions were modified.
- **`CONTEXT.md` / `context.md`**: Update domain terms, definitions, or architectural concepts if new domain language emerged during the session.

If no project documentation files were affected by this session, state that explicitly.

## Step 7 — Handoff prompt

Save a handoff file following this convention:

```
$VAULT/hand-off/<project>/<task>/DD-MM-YYYY/handoff.md
```

- `<project>` / `<task>` inferred from what this session actually worked on (match existing
  naming under `$VAULT/hand-off/` where a matching project/task folder already
  exists — reuse it and append a new dated section rather than starting a fresh naming
  scheme).
- If today's dated folder for this exact task already exists (i.e. `/sumup` already ran
  today), update that file in place instead of creating a duplicate.
- Structure to match existing handoffs (see any file under `$VAULT/hand-off/` for
  tone/format): a `# Handoff — <Task> (YYYY-MM-DD)` header, then sections for what was
  completed, what's still open/unresolved (from Step 3), gotchas learned, and concrete next
  steps to execute — including relevant file paths so a fresh session doesn't have to
  re-discover them.
- **Handoff rule**: if this session was one task out of a multi-task list (other
  deferred/on-the-list tasks exist), make sure every one of those other tasks still has its
  own up-to-date handoff too — don't let sibling tasks go stale just because this session
  only touched one of them.

Then output the handoff as a **self-contained prompt block** directly in the chat, ready
for the user to paste into a fresh Claude Code session:

```
Continuing: <task name>

Current state:
<2-4 lines — what's done, what's unresolved>

Next steps:
1. ...
2. ...

Relevant files:
- <absolute path> — <why it matters>

Full handoff: $VAULT/hand-off/<project>/<task>/DD-MM-YYYY/handoff.md
```

## Output

At the end of `/sumup`, the user should have:

1. A what/issue/fix/retrospective summary in chat.
2. (If a genuine lesson surfaced) a new memory file + `MEMORY.md` index line.
3. A session note in the correct Obsidian folder.
4. Project documentation (README.md, CLAUDE.md, AGENTS.md, SKILL.md, CONTEXT.md) updated if changes occurred.
5. A handoff file saved to `$VAULT/hand-off/...` and a paste-ready handoff prompt
   printed in chat.
