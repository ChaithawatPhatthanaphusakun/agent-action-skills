---
name: job-hunter
description: Find, evaluate, tailor, apply to, and follow up on jobs using browser automation, verified resume evidence, GitHub portfolio context, email tools, and a private application ledger. Use when the user asks to hunt or apply for jobs, tailor or update a resume/CV, prepare or send recruiter outreach, schedule application follow-ups, monitor replies, or manage a job-search pipeline across LinkedIn, company career sites, ATS platforms, GitHub, and email.
---

# Job Hunter

> **Note:** if you also want LinkedIn/GitHub profile-presence management,
> autonomous connection-request handling, and Gmail-based job-lead discovery
> merged into the same workflow, that combined skill is called `career-pilot`.
> This package stays the standalone job-search-only version for anyone who
> doesn't want the larger merged workflow.

Run a truthful, evidence-backed job search from discovery through follow-up. Keep
personal data outside the skill and never trade application quality or factual
accuracy for application volume.

## Load only what the run needs

- Read [references/candidate-profile.md](references/candidate-profile.md) when
  locating or creating the user's private candidate profile.
- Read [references/approval-policy.md](references/approval-policy.md) before
  submitting an application, sending outreach, or replying to a recruiter.
- Read [references/platform-playbook.md](references/platform-playbook.md) before
  operating a job site, ATS, GitHub, or email surface.
- Read [references/outreach.md](references/outreach.md) for cold email and
  follow-up work.

## 1. Establish the run contract

Locate the candidate profile from `JOB_HUNTER_PROFILE` or a user-provided path.
If neither exists, create a private profile from the template in
`references/candidate-profile.md`; never place it in this repository.
Resolve this skill's absolute directory as `SKILL_DIR` before running bundled
scripts when the host does not provide it.

Confirm or infer the requested operation:

- `research`: discover, deduplicate, score, and report.
- `review`: prepare or fill applications and messages, then pause at the
  approval boundary.
- `autopilot`: submit or send only within explicit, stored rules.

Default to `review` when the profile does not specify a mode. A prior approval
for one application is not standing approval for unrelated applications.

Validate the profile:

```bash
python3 "$SKILL_DIR/scripts/validate_profile.py" "$JOB_HUNTER_PROFILE"
```

## 2. Build the evidence set

Read the canonical resume, verified-experience bank, portfolio links, and GitHub
projects. Separate:

- verified facts that may be asserted;
- reasonable positioning or emphasis;
- missing evidence that must not be claimed.

Update the canonical resume only when the user asks or when verified newer
evidence is available. Preserve a source resume and create a new tailored
version rather than overwriting it. Record which resume was used for every
application.

## 3. Discover and qualify jobs

Search multiple sources instead of relying on one feed. Prefer original company
postings over aggregators. Capture the full description, source URL, company,
location, work arrangement, schedule, employment type, compensation, required
experience, work authorization, and application deadline.

Reject or flag hard blockers before tailoring:

- unavailable geography or work authorization;
- incompatible working hours or employment type;
- compensation below the stored floor;
- mandatory qualifications contradicted by verified facts;
- closed, suspicious, duplicated, or misleading listings.

Score remaining jobs from 0–100 using role fit, evidence strength, eligibility,
schedule, compensation, and application effort. Explain the score; do not hide
a stretch requirement inside one number.

Add discoveries to the private ledger:

```bash
python3 "$SKILL_DIR/scripts/job_ledger.py" add "$JOB_HUNTER_LEDGER" \
  --company "<company>" --role "<role>" --url "<url>" \
  --source "<source>" --score <0-100> --status shortlisted
```

## 4. Tailor the application

Select the strongest verified evidence for the job. Tailor the summary, bullet
ordering, skills, cover letter, and short answers without changing factual
meaning. Never invent years of experience, degrees, employers, production use,
salary history, work authorization, or demographic information.

Answer screening questions directly. Stop when the truthful answer may
disqualify the candidate instead of changing the answer.

## 5. Apply and verify

Use the platform playbook. Keep one browser driver in control at a time. Fill
and upload first, inspect the final review state, apply the approval policy,
then submit if authorized.

Treat a click as an attempt, not proof. Verify a confirmation message,
application-status change, confirmation email, or company-portal record.
Capture evidence without exposing private fields in shareable artifacts.

Update the ledger only after verified submission:

```bash
python3 "$SKILL_DIR/scripts/job_ledger.py" update "$JOB_HUNTER_LEDGER" <id> \
  --status applied --applied-at "<ISO-8601>" \
  --resume "<private resume path>" --follow-up-at "<YYYY-MM-DD>"
```

## 6. Outreach, follow-up, and replies

Use a connected email tool first and browser automation only as a fallback.
Research the recipient and personalize the message with one relevant reason.
Do not scrape or blast large contact lists.

Scheduled unattended runs may discover jobs, update the ledger, and prepare
drafts. Sending requires the stored approval mode. Re-check the thread before
sending a scheduled follow-up so a reply, rejection, or interview invitation
does not receive a stale message.

List due follow-ups:

```bash
python3 "$SKILL_DIR/scripts/job_ledger.py" due "$JOB_HUNTER_LEDGER"
```

Classify inbound replies as acknowledgement, question, screening, interview,
rejection, or offer. Draft a response grounded in the original application and
pause for decisions involving compensation, availability commitments, legal
terms, or acceptance.

## 7. Report the outcome

Return a compact run summary:

- jobs found, rejected, shortlisted, and applied;
- each submitted role, compensation, resume version, and confirmation evidence;
- drafts or follow-ups awaiting approval;
- blockers, stretch requirements, and next due action.

Never report an application or email as sent without verification.
