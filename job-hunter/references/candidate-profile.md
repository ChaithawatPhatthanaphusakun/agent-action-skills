# Private candidate profile

Store candidate data outside the public skill repository. Point
`JOB_HUNTER_PROFILE` to a private JSON file and `JOB_HUNTER_LEDGER` to a private
application-ledger JSON file.

Use this shape as a starting point:

```json
{
  "version": 1,
  "identity": {
    "name": "PRIVATE",
    "location": "PRIVATE",
    "timezone": "Area/City",
    "email": "PRIVATE",
    "phone": "PRIVATE",
    "linkedin": "PRIVATE",
    "github": "PRIVATE"
  },
  "paths": {
    "canonical_resume": "/private/path/resume.md",
    "verified_experience": "/private/path/verified-experience.md",
    "application_output": "/private/path/applications"
  },
  "targets": {
    "roles": ["role family"],
    "keywords": ["skill"],
    "employment_types": ["contract", "part-time"],
    "hours_per_week": {"min": 10, "max": 30}
  },
  "constraints": {
    "remote_only": true,
    "eligible_locations": ["Worldwide"],
    "timezones": ["APAC", "Europe"],
    "regular_overnight": false,
    "minimum_compensation": {
      "amount": 0,
      "currency": "USD",
      "period": "hour"
    }
  },
  "approvals": {
    "mode": "review",
    "application_submission": "ask",
    "outreach_send": "ask",
    "follow_up_send": "ask",
    "compensation_commitment": "ask"
  }
}
```

Keep verified experience in a human-readable file that names the evidence for
each claim: repository, deployed product, employer record, testimonial, commit,
or document. Treat unverified self-description as context, not as a claim that
may be inserted into an application.

Record projects and roles as impact evidence, not feature inventories:

```markdown
## Project or role

- Beneficiary: Who experienced the problem?
- Problem: What was slow, manual, error-prone, or blocked?
- Previous workflow: How was the work done before?
- Intervention: What did the candidate build or change?
- Outcome: What became faster, safer, easier, or more reliable?
- Measurement: Before/after time, volume, error rate, or `not measured`
- Evidence: Repository, artifact, user confirmation, testimonial, or document
- Confidence: `measured`, `attributable`, `user-reported`, or `intended`
- Relevant capabilities: Technologies and skills demonstrated
```

Use [impact-writing.md](impact-writing.md) to translate these records into
truthful recruiter-facing summaries and bullets.

Do not commit:

- the populated profile;
- resumes containing contact information;
- browser profiles, cookies, or session tokens;
- application ledgers or recruiter email addresses;
- screenshots containing form fields or private messages.
