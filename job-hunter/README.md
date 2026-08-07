# job-hunter

Evidence-backed job search skill for Claude Code and Codex. It finds and scores
roles, tailors applications from facts you can verify, pauses at approval
boundaries, and tracks submissions and follow-ups in a private ledger.

## Workflow

### 1. Research and score

Discover jobs across original company sources, reject hard blockers early, and
rank the remaining roles with explainable scores.

### 2. Tailor and review

Build an evidence set from the candidate's real resume and portfolio, tailor the
application, then stop before submission unless stored approval rules allow it.

### 3. Verify and follow up

Treat submission as complete only after confirmation, record it in the private
ledger, and prepare due follow-ups without sending stale messages.

## Modes

| Mode | Behavior |
|---|---|
| `research` | Discover, deduplicate, score, and report. Nothing is sent. |
| `review` | Prepare applications and messages, then stop for approval. Default. |
| `autopilot` | Submit only within rules explicitly stored in the private profile. |

Every claim must trace back to a repository, shipped product, employer record,
or commit. The skill never invents experience, degrees, or production usage to
clear a filter.

## Example

```text
/job-hunter
Find part-time remote backend roles, 10–20 h/week, and draft applications for
the best three.
```

The skill validates the private profile, builds the evidence set, searches and
scores listings, updates the private ledger, and drafts tailored applications.
In default `review` mode, the user reviews and submits.

## Install

Clone the `agent-action-skills` repository, then install this package:

```bash
git clone https://github.com/ChaithawatPon/agent-action-skills.git
cd agent-action-skills
python3 scripts/install-skill.py job-hunter --dest "$HOME/.claude/skills"
```

## Private configuration

Personal data never belongs in this repository. Point these environment
variables at private files:

```bash
export JOB_HUNTER_PROFILE="$HOME/.private/job-hunter/profile.json"
export JOB_HUNTER_LEDGER="$HOME/.private/job-hunter/ledger.json"
```

Create the profile from
[references/candidate-profile.md](references/candidate-profile.md), then
validate it:

```bash
python3 scripts/validate_profile.py "$JOB_HUNTER_PROFILE"
```

Initialize the ledger:

```bash
python3 scripts/job_ledger.py init "$JOB_HUNTER_LEDGER"
```

Browser automation and email remain optional. Without them, `research` mode and
application drafting still work.

## Development

Run tests:

```bash
python3 scripts/test_job_hunter.py
```

Regenerate README GIFs:

```bash
scripts/render_readme_gifs.sh
```

