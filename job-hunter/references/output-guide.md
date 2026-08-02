# Output guide

Every Job Hunter run should make the result understandable without reading raw
automation logs.

## Shortlist

For each role show:

- company, role, original URL, source, location, schedule, and employment type;
- score from 0–100;
- verified evidence that supports the score;
- hard blockers, stretch requirements, and missing evidence;
- ledger status and one next action.

Next actions:

- `rejected` — state the verified blocker; do not tailor;
- `shortlisted` — review evidence and choose whether to draft;
- `approval-needed` — show the materially complete draft or form state.

## Application draft

Show:

- the selected verified evidence and resume version;
- the selected impact records and their confidence level;
- tailored text or answers;
- claims deliberately omitted because evidence is missing;
- the target account, role, and form/message destination;
- the exact external action waiting for approval.

A draft is not an application. Never label it submitted or sent.

## Ledger

`ledger.json` is the machine-readable source of pipeline state.
`ledger-review.md` is a human-readable view generated with:

```bash
python3 "$SKILL_DIR/scripts/job_ledger.py" export-markdown \
  "$JOB_HUNTER_LEDGER" "$PRIVATE_OUTPUT/ledger-review.md"
```

Important statuses:

- `discovered` — captured, not yet qualified;
- `rejected` — verified hard blocker;
- `shortlisted` — worth evidence review;
- `approval-needed` — external action is staged and waiting;
- `applied` — submission independently confirmed;
- `follow-up-due` — confirmed application is ready for thread recheck;
- `replied`, `interview`, `offer`, `closed` — downstream verified state.

## Run summary

End each run with:

- counts found, rejected, shortlisted, drafted, applied, and awaiting approval;
- each real external action and its confirmation evidence;
- output paths or private ledger IDs;
- blockers and evidence gaps;
- the next due action.

Use `0`, `none`, or `not verified` instead of omitting an important category.
Never infer success from an automation command's exit status.

## Doctor output

`job_hunter_doctor.py` reports:

- `status` — local private setup readiness;
- `approval_mode` — research, review, or autopilot;
- `profile` and `ledger` — path state, permission mode, and ledger record count;
- `tools` — discovery plus the intended use of each boundary tool;
- `outputs` — the four user-facing artifact types;
- `recovery` — exact commands when setup is not ready;
- `next_action` — one safe continuation step.

Doctor never proves eligibility, authentication, external approval, or
submission. Those remain run-specific verification gates.
