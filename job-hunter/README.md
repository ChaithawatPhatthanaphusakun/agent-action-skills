# job-hunter

Runs a job search end to end — find roles, score them against your constraints, tailor a resume from evidence you can actually back up, prepare the application, and track follow-ups in a private ledger.

## What it does

Three modes, and it defaults to the cautious one:

- `research` — discover, deduplicate, score, and report. Nothing is sent.
- `review` — prepare applications and messages, then stop at the approval boundary (the default).
- `autopilot` — submit only within rules you have explicitly stored in your profile.

Every claim it writes has to trace back to a repository, a shipped product, an employer record, or a commit. It will not invent years of experience, degrees, or production usage to clear a filter.

## Example

**You type:**
```
/job-hunter
Find part-time remote backend roles, 10-20 h/week, and draft applications for the best 3.
```

**What happens:**

1. Loads your private profile from `JOB_HUNTER_PROFILE` and validates it.
2. Builds an evidence set from your canonical resume and portfolio.
3. Searches, deduplicates, and scores listings against your constraints.
4. Adds discoveries to your private ledger.
5. Drafts tailored applications and stops — you review and submit.
6. Records the submission and schedules the follow-up date only after you confirm it went out.

## Setup

Your personal data never lives in this repo. Point two environment variables at private files outside it:

```bash
export JOB_HUNTER_PROFILE="$HOME/.private/job-hunter/profile.json"
export JOB_HUNTER_LEDGER="$HOME/.private/job-hunter/ledger.json"
```

Create the profile from the template in [references/candidate-profile.md](references/candidate-profile.md) — it holds your identity, resume paths, target roles, constraints, and approval rules. Validate it before the first run:

```bash
python3 job-hunter/scripts/validate_profile.py "$JOB_HUNTER_PROFILE"
```

The ledger is written on first use, so no setup is required beyond the path. To create it up front:

```bash
python3 job-hunter/scripts/job_ledger.py init "$JOB_HUNTER_LEDGER"
```

Browser automation and email are used only if your host provides those tools. Without them the skill still runs `research` and drafts, and hands you the text to paste.

## Install

```bash
cp -r job-hunter ~/.claude/skills/
```
