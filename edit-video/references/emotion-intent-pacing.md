# Emotion / Intent / Pacing Model

Status: reusable reference; suggestions only. This model never edits or
publishes media without the normal proposal, preview, and human-review gates.

## Purpose

Turn observable story, speech, expression, movement, and music signals into
explainable editing suggestions. The model helps an editor notice strong
moments; it does not claim to know a person's private emotional state and does
not replace human judgment.

## Unit of analysis

Analyze source clips as versioned segments with immutable source coordinates:

```yaml
source_id: clip-04
source_start: 61.0
source_end: 63.0
analysis_version: 1
```

Never rewrite source timestamps after a cut. Timeline positions belong in a
separate edit-decision list.

## Controlled labels

### Story intent

- `hook`, `context`, `setup`, `process`, `payoff`, `reaction`, `transition`,
  `cta`, `discard`, `unknown`

### Observable expression

- `neutral`, `smile`, `laugh`, `surprise-look`, `concentration-look`,
  `speaking`, `taste-reaction`, `not-visible`, `uncertain`

These labels describe visible behavior only. Do not infer health, personality,
ethnicity, sexuality, politics, or a person's true internal emotion.

### Editorial energy

- `quiet`, `steady`, `rising`, `peak`, `release`

### Speech act

- `none`, `question`, `claim`, `explanation`, `instruction`, `punchline`,
  `reaction`, `filler`, `unclear`

## Evidence and confidence

Record transcript, prosody, visible expression, motion, approved music beat,
story relation, technical quality, and privacy separately. Confidence is
`high`, `medium`, or `low`. Low-confidence evidence may suggest review but may
not trigger an automatic keep or cut.

Priority order is **privacy → meaning → continuity → rhythm → decoration**.

## Suggestion mapping

- Keep a segment when it advances the story, contains a clear payoff/reaction,
  or supplies necessary continuity.
- Shorten repeated process footage when the story state has not changed.
- Preserve meaningful silence before a punchline or reveal; shorten setup
  delay only when speech meaning and continuity remain intact.
- Caption reviewed speech, essential context, and sound-off hooks. Do not burn
  uncertain transcript text.
- Suggest a subtle 103–112% punch-in only to direct attention to a verified
  subject, action, or result—not to manufacture emotion.
- Prefer action completion or a shot change within ±120 ms of a strong approved
  beat when it helps; story and intelligible speech take priority over music.

## Explainable decision record

```yaml
decision_id: d-007
source_id: clip-04
source_range: [61.0, 63.0]
intent: process
energy: rising
evidence:
  - visible ingredient/action change
  - non-redundant story state
proposal:
  action: keep
  timeline_duration: 2.0
  caption: null
  zoom: 1.06
  beat_alignment: optional-after-music-approval
confidence: high
privacy: review-public-background
status: proposed
```

Statuses are `proposed`, `approved`, `edited`, `rejected`, and `superseded`.
Only the human reviewer changes a proposal to `approved`.

## Version and approval loop

1. Freeze `analysis-v1` against source hashes and timestamps.
2. Produce `cut-proposal-v1` with numbered, explainable suggestions.
3. The reviewer marks each decision Approve, Edit, or Reject.
4. Render `preview-v1` and record the exact source ranges used.
5. New judgments create a new version; never silently mutate v1.
6. Add licensed music and reviewed transcript/captions only after their gates.
7. Render `final-v1` only after preview, music, transcript, privacy, and
   provenance gates pass.

## Quality tests

- Every proposal cites an immutable source range and observable reason.
- Every label uses the controlled vocabulary or `unknown`/`uncertain`.
- Low-confidence evidence cannot create an automatic cut.
- Privacy uncertainty blocks public use.
- Transcript-derived captions require reviewed source-audio text.
- Beat alignment cannot override speech meaning or continuity.
- Version history retains rejected and superseded decisions.
- A human can reproduce the cut from the final cut list.

After a clean-room edit, compare preparation time, review loops, and correction
count with the prior manual workflow. Continue development only when it saves
meaningful time without increasing privacy, caption, continuity, or approval
errors.
