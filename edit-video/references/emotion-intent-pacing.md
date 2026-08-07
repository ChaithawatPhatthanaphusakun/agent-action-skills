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

## Transition and effect suggestions

These map the same controlled labels above to concrete ffmpeg-native choices
for cut transitions and visual-emphasis effects. Like every other mapping in
this file, these are **suggestions the human reviewer approves**, not
automatic or silent choices — they slot into the same proposal/grade/approve
loop as a keep/cut decision, and go in the decision record's `proposal`
block alongside `zoom` and `beat_alignment`.

### Transitions between two segments (ffmpeg `xfade`/`acrossfade`)

| Story intent of the incoming segment | Suggested transition | Why |
| --- | --- | --- |
| `hook` → `context` | hard cut (no `xfade`) | Hooks need immediacy; a soft transition dilutes the opening beat. |
| `context` → `setup`, `setup` → `process` | short `fade` or `fadeblack` (~150–250 ms) | Signals a settling, non-urgent scene change without implying time has jumped far. |
| `process` → `process` (same task, later step) | `wipeleft`/`wiperight` or `slideleft`/`slideright` (~200 ms) | Directional wipes read as "next step," reinforcing procedural continuity. |
| `setup`/`process` → `payoff` | hard cut or a very fast `fade` (<150 ms) | Payoffs land harder on a clean cut; a slow dissolve softens the reveal. |
| `payoff` → `reaction` | hard cut | Preserve the immediacy of a genuine reaction; don't let a transition pre-empt it. |
| `reaction`/`payoff` → `transition` (explicit scene/location change) | `dissolve`/`fade` (~300–400 ms) or `distance` | Longer dissolves read as a location or time jump, matching the `transition` label's own meaning. |
| anything → `cta` | hard cut, sometimes with a brief `fadeblack` before on-screen text | Calls to action benefit from a clean, readable entry rather than a busy transition. |
| `discard` | not used in the timeline | Discarded segments don't get a transition treatment at all. |

Energy modulates duration, not choice: `quiet`/`steady` segments can take a
slightly longer transition (250–400 ms); `rising`/`peak` segments should stay
under ~150 ms or use a hard cut so the transition doesn't blunt momentum;
`release` can take a longer, softer dissolve.

### Visual-emphasis effects

| Signal | Suggested effect | Why |
| --- | --- | --- |
| `energy: peak` + `intent: payoff` | subtle punch-in, per the existing 103–112% zoom rule above | Already defined above; repeated here so it reads alongside transition choices in one place. |
| `intent: process`, low visual contrast between frames | slow ken-burns pan/zoom (105–110% over the segment) | Adds motion to otherwise static process footage without implying an emotional claim. |
| `intent: hook`, `energy: quiet` or `steady` | none, or a very light vignette | Let the hook's content carry the moment; heavy effects on a hook read as compensating for a weak one. |
| `intent: setup`/`context`, `speech act: explanation` | text-reveal timed to the transcript's phrase boundaries (not word-by-word) | Reinforces what's being said without overwhelming reading speed. |
| `intent: transition` (explicit scene change) | brief subtle color-grade shift (e.g. slightly cooler/warmer) alongside the dissolve above | Reinforces the sense of a new location/time without changing footage content. |
| `intent: reaction`, `expression: laugh`/`surprise-look` | none | Genuine reactions read best unedited; adding an effect here risks looking manufactured. |
| `intent: cta` | steady framing, optional light vignette to draw eyes to on-screen text | Keeps focus on the action being requested rather than the visual. |

As with keeps and cuts: low-confidence evidence (see "Evidence and
confidence" above) may suggest an effect for review but must not trigger an
automatic application, and privacy priority still outranks any decorative
choice.

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
