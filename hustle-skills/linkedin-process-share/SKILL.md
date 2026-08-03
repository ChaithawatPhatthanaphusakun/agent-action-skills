---
name: linkedin-process-share
description: Create an immutable, privacy-safe, review-only LinkedIn process-post packet from audited public iampon-p/skills, edit-video, fixbill-cli, or job-hunter evidence. Use when asked to turn public project work into a LinkedIn draft, classify public/private provenance, or prepare an exact post preview. Never use it to publish, edit a profile, or act on a social account without separate explicit approval.
---

# LinkedIn process share

Create a draft and immutable review packet from audited public repository
evidence only. Default to draft/review mode. This skill does not publish,
schedule, send, or edit a LinkedIn profile.

## Evidence boundary

Use only tracked, unchanged files from these audited public repositories:
`iampon-p/skills`, `iampon-p/edit-video`, `iampon-p/fixbill-cli`, or
`iampon-p/job-hunter`. The gate anonymously verifies the exact HEAD commit on
GitHub and fails closed on an API/network error. Private notes may help identify
a topic but must never enter the packet, draft, or command input.

Before writing, run the deterministic gate from the checked-out public repo:

```bash
python3 linkedin-process-share/scripts/build_review_packet.py \
  --repo-root /path/to/public-repo \
  --evidence README.md SKILLS.md \
  --draft /path/outside/repo/post-draft.md \
  --account "https://www.linkedin.com/in/example-profile/" \
  --audience "anyone" \
  --recruiter-benefit "Shows evidence-backed engineering judgment." \
  --media no-media \
  --employer-data none \
  --customer-data none \
  --analytics-data none \
  --private-data none \
  --unreleased-data none \
  --output /path/to/review_packet.json
```

Draft the post before running the gate: problem → approach → decisions → result
→ lesson → evidence. The gate requires an external prepared draft and exact
canonical LinkedIn account URL, constrained audience, recruiter benefit, and
media (`no-media` or external image/video/document files). Explicitly classify
employer, customer, analytics, private, and unreleased disclosure as `false` or
`none`; uncertainty fails closed. It rejects publishing actions, symlinks,
untracked/dirty evidence, sensitive content, and output inside the repository.

## Draft workflow

1. Read the public citations and draft: problem → approach → decisions → result
   → lesson → evidence. Never add claims that lack a citation.
2. Run the gate and show the exact `preview` plus `preview_sha256`.
3. Ask for separate explicit approval that names that exact hash. A request to
   draft, review, or improve text is never approval to publish.
4. A separate controlled publishing process must re-check the unchanged hash,
   publish only after approval, verify the live URL while logged out, and record
   the result outside this repository. This script remains incapable of posting.

## Privacy rules

- Exclude precise addresses/locations, live travel, routines, family,
  recovery clues, IDs, contact details, private employer/customer information,
  non-public analytics, unreleased work, credentials, local paths, and private
  notes.
- Prefer the public repository's wording. Generalize details when a fact is
  not needed to explain the work.
- If provenance or privacy is uncertain, stop and request public-safe evidence.

See [references/review-packet.md](references/review-packet.md) for the exact
packet schema, privacy classes, and fail-closed behavior.
