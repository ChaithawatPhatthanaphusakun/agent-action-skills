# Recommended tools

Status: research reference, not a dependency list. Nothing named here is
installed by this skill automatically — the "do not install tools without
the user's approval" gate in `SKILL.md` applies to every tool below exactly
as strictly as it applies to anything else.

## Why this file exists

Cut detection, scene analysis, and transcription are solved problems with
mature, actively-maintained open-source tools behind them. Reinventing
silence-detection or shot-boundary heuristics from scratch is more error-prone
and more work than wrapping an established tool. This file names the tools
worth reaching for and the concrete niche each one fills in this skill's
ffmpeg-based workflow. It does not replace the human review gates in
`SKILL.md` — proposing where a cut or transcript came from still goes through
the same grade/approval steps.

## Before installing anything

Every tool below is a *candidate*, not a default. Before running an install
command for any of them:

1. **Ask first.** Tell the user what the tool does and exactly why this task
   needs it — don't install silently "to save a step."
2. **Check how fresh the release is.** If the version you're about to install
   was tagged/published or last updated recently (a rough rule of thumb: in
   the last 30 days), say so explicitly and flag it as a possible
   supply-chain risk before asking for the go-ahead. This reference was
   written without live release-date access, so treat every version number
   below as illustrative, not verified-current — re-check the tool's actual
   release history at install time rather than trusting anything here.
3. **Wait for an explicit yes** before running the install command.
4. Prefer the narrowest install surface available (e.g. a single pinned
   binary or a project-local virtualenv/npm install over a global one), and
   never install anything that requires a cloud API key when a local mode
   exists, since this skill is a local, no-cloud-API-required workflow by
   design.

## Cut / jump-cut automation — `auto-editor`

- **What it does:** ffmpeg-based CLI that detects silence (and, optionally,
  motion) and automatically removes those spans, producing a jump-cut edit
  or an EDL/cut list. Actively maintained, widely used for podcast/talking-
  head jump-cut editing.
- **Why it fits here:** it sits directly on top of ffmpeg (no separate
  runtime paradigm to bridge), matches this skill's "local ffmpeg-based
  workflow, no cloud APIs" constraint, and its `--export` options can emit a
  cut list rather than only a rendered file — useful for producing the
  reviewable, timestamped cut proposal this skill already requires before
  any render.
- **How to use it inside the gates:** treat its silence/jump-cut output as a
  *proposal*, exactly like a manually authored cut list — it still needs the
  step-2 grade/approval pass before anything is rendered final. Never let it
  render straight to `final.mp4`.

## Scene-cut detection — `PySceneDetect`

- **What it does:** Python library/CLI (`scenedetect`) for detecting hard
  cuts and scene changes in existing footage via content-aware and threshold
  detectors, and for splitting/exporting scenes.
- **Why it fits here:** useful specifically for folder drop-ins with
  multiple pre-existing edited or multi-scene source files, where you need to
  know where scene boundaries already fall before proposing new cuts on top
  — complements `auto-editor` (which trims silence/motion within a
  continuous take) rather than duplicating it.
- **How to use it inside the gates:** its scene-boundary output feeds the
  inventory/contact-sheet step as evidence, not as an automatic cut decision
  — boundaries still need to be reflected in the human-reviewed cut
  proposal.

## Transcription — `whisper.cpp` (recommended default when transcription is wanted)

- **What it does:** a C/C++ port of OpenAI's Whisper speech-to-text model
  that runs fully locally (CPU or GPU), no network call required once model
  weights are downloaded.
- **Why it's the concrete recommendation here:** `SKILL.md` already treats
  transcription as optional and backend-agnostic ("available user-approved
  backend"); `whisper.cpp` is named explicitly because it satisfies the
  local/no-cloud-API framing better than a hosted transcription API would,
  and it's one of the most widely used, actively maintained options for
  local Whisper inference. The original Python `whisper` package (or
  `faster-whisper`) is a reasonable alternative when a Python environment is
  already in play and a compiled build is inconvenient — same approval gate
  applies either way.
- **How to use it inside the gates:** still optional, still requires the
  user to approve the backend before it runs, and its output is still a
  *draft transcript* that gets reviewed before any caption is burned in —
  exactly the existing "review the transcript before burning captions" step.
  Model-weight downloads (whisper.cpp needs a separate model file) count as
  the same kind of install/download this skill's gate already covers — ask
  first.

## Transitions — no extra tool needed

Crossfades, wipes, and slides between clips are handled natively by ffmpeg's
`xfade` (video) and `acrossfade` (audio) filters — see `SKILL.md`'s Workflow
step 4 and the "Transition and effect suggestions" section of
`emotion-intent-pacing.md`. No OSS tool recommendation is needed for this
piece; adding one would be exactly the kind of unnecessary dependency this
file is trying to steer away from.

## Deliberately not recommended (for now)

- **Cloud-hosted cut/scene-detection or transcription APIs** — out of scope
  by this skill's own "no cloud APIs unless approved" framing; a local tool
  is preferred whenever one exists, which is true for every capability
  above.
- Anything not named above should go through the same three-step ask-first
  process rather than being assumed safe because it wasn't flagged as risky
  here — absence from this list is not a recommendation either way.
