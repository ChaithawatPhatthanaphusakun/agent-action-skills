# Platform playbook

## Driver selection

Use Agent Browser for navigation, snapshots, stable element references, and
visible confirmation. Use Playwright for CDP inspection, file upload, complex
widgets, exact DOM state, and recovery when a browser command cannot interact
reliably.

Do not let Agent Browser and Playwright act concurrently on the same page.
Attach Playwright to the existing browser session rather than launching a
second logged-in session when possible.

## General sequence

1. Open the original listing and capture its current state.
2. Confirm the job is open and the displayed role/company match the ledger.
3. Read the full description and application-page contradictions.
4. Check geography, authorization, schedule, seniority, and compensation.
5. Save or generate a dedicated resume copy.
6. Fill fields and upload files.
7. Review every answer and optional subscription checkbox.
8. Apply the approval policy.
9. Submit once.
10. Wait, then verify confirmation independently.
11. Record the result and evidence.

## LinkedIn

- Prefer the canonical `/jobs/view/<id>/` URL for deduplication.
- Treat "remote" as work arrangement, not worldwide eligibility.
- Compare the LinkedIn description with the external ATS form.
- Uncheck optional company-follow or marketing boxes unless requested.
- On Easy Apply, scroll the review dialog before clicking the final button;
  off-screen controls may appear actionable without receiving the click.
- Verify the "application sent" state or LinkedIn application status.

## Company ATS

Greenhouse, Lever, Ashby, Workday, and custom portals may repeat or contradict
the aggregator listing. The application form is authoritative for location,
employment type, experience, and required attestations.

Do not create a portal account without authorization. Never reuse or expose
passwords. Stop for CAPTCHA, MFA, identity verification, assessments, or terms
that require personal review.

## GitHub

Use GitHub as evidence: verify public repositories and rendered READMEs, locate
project proof, link a small number of relevant projects, and check that public
pages do not expose secrets or contradict the application.

Do not claim repository ownership or contribution without verification. Do not
modify profile or repository content unless the user separately requests it.

## Email and messaging

Prefer a connected mail or messaging tool because it provides structured thread
and send status. Use browser automation only when no suitable connector exists.

Before sending through a browser, confirm the active account and recipient,
inspect the thread, verify subject, attachments, signature, and scheduled-send
time, apply the approval policy, and confirm the message appears in Sent or
Scheduled.

Never expose session cookies, access tokens, private message contents, or
recruiter contact data in committed artifacts.
