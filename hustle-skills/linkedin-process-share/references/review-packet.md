# Review packet contract

`build_review_packet.py` writes deterministic JSON with these fields:

- `status`: always `review_required`.
- `publication`: always `not_authorized`.
- `preview`: exact prepared text, immutable evidence links, account, audience,
  recruiter benefit, and media supplied to the gate. Media is either
  `no-media` or a manifest containing each external file's filename, SHA-256,
  and byte size.
- `preview_sha256`: hash of the canonical preview JSON. Approval must name this
  hash; a later publishing process must re-check it before acting.
- `evidence`: repository URL, publicly verified commit, file paths, and
  SHA-256 values.
- `approval_required`: always `true`.
- `classifications`: explicit employer, customer, analytics, private, and
  unreleased disclosure classifications. Every value must be `false` or `none`;
  `true` and `uncertain` fail closed.

The gate accepts only the audited `iampon-p` repositories named in `SKILL.md`.
It rejects a non-public/unverified HEAD, network/API errors, evidence outside
the checkout, symlinks (including parents), untracked or changed files,
unsupported types, oversized evidence, output inside the checkout, existing
outputs, and `--action publish`.

It conservatively rejects concrete local paths, credentials, email/phone values,
precise addresses or coordinates, live travel/routine clues, IDs/recovery clues,
and labelled private/employer/customer/analytics/unreleased values. Analytics
includes non-public dashboards, measurements, conversion results, and internal
performance data. Generic policy words alone do not fail the gate. When a
possible disclosure matches, it fails closed: remove/generalize it or provide
different public evidence. The packet is a review artifact, not permission to
publish.
