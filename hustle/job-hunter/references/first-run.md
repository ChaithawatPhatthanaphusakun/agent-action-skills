# First run and recovery

Use this guide when setting up Job Hunter on a new machine or when the workflow
output is unclear.

## 1. Create private storage

Resolve the installed skill directory as `SKILL_DIR`, then run:

```bash
python3 "$SKILL_DIR/scripts/setup_private_data.py" \
  "$HOME/.private/job-hunter"
export JOB_HUNTER_PROFILE="$HOME/.private/job-hunter/profile.json"
export JOB_HUNTER_LEDGER="$HOME/.private/job-hunter/ledger.json"
```

Edit the generated profile privately. Keep real names, contact details, resumes,
evidence, recruiter data, and screenshots outside the skill repository.

## 2. Ask doctor what is ready

```bash
python3 "$SKILL_DIR/scripts/job_hunter_doctor.py"
```

The report answers:

- whether profile and ledger files are valid;
- which approval mode is active;
- which local browser, GitHub, and session-provided email tools are available;
- which outputs the workflow produces;
- the next action or exact recovery commands.

Agents can request the same contract as JSON:

```bash
python3 "$SKILL_DIR/scripts/job_hunter_doctor.py" --json
```

`READY` means the private files are readable and structurally valid. It does not
mean a browser is authenticated, a job is eligible, or an external action is
approved.

## 3. Run the safe local fixture

Use an empty private directory:

```bash
python3 "$SKILL_DIR/scripts/first_run_demo.py" \
  --workspace "$HOME/.private/job-hunter-demo"
```

The demo uses a synthetic reserved-domain listing and performs no browser,
email, or submission action. It proves the local setup, profile validation,
shortlist recording, and ledger review paths. Inspect:

- `profile.json` — private run configuration;
- `ledger.json` — machine-readable pipeline state;
- `ledger-review.md` — human-readable review.

Remove the demo directory only after confirming it contains no user-added data.

## 4. Run one real research loop

1. State a target role, source URL, or search constraints.
2. Confirm the doctor report and approval mode.
3. Read the original listing and reject hard blockers.
4. Produce a scored shortlist with evidence strengths and gaps.
5. Record the listing in the private ledger.
6. Explain the status and one next action using
   [output-guide.md](output-guide.md).

Stop at research. A successful first run does not require form filling,
submission, outreach, or authenticated browser access.

## PASS gate

PASS only when a new user can:

- identify the available tools and why each would be used;
- locate the profile, ledger, and generated outputs;
- explain the shortlist score and ledger status;
- name the next action and approval boundary;
- recover from unset or missing private paths using the doctor report.

Mark the run INCONCLUSIVE when external authentication or a real listing is
unavailable. Mark it FAIL when local setup, validation, ledger recording, or
output interpretation breaks.

## Recovery

| Symptom | Meaning | Next action |
|---|---|---|
| `profile=unset` or `ledger=unset` | Environment variables are not configured | Run the recovery exports printed by doctor |
| `missing` | Configured path does not exist | Confirm the intended private directory; initialize only if it is new |
| `invalid` | JSON or required approval mode is invalid | Run `validate_profile.py`, repair privately, rerun doctor |
| Browser tool unavailable | That driver cannot be used locally | Use the available driver or remain in research-only mode |
| External confirmation absent | A click or send attempt is unverified | Do not mark applied/sent; inspect the platform or thread |
