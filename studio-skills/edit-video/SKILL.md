---
name: edit-video
description: Edit short vertical videos with a local ffmpeg-based workflow — drop in a single clip or a whole folder of raw footage. Propose cuts, auto-draft a narration script from the footage, add xfade transitions and intent-driven visual effects, create captioned previews, mix approved music or an approved cloned voice, and render an MP4 with a readable cut list. Use when asked to edit raw clips, edit a folder of footage, add captions, add narration, or make a vertical reel.
---

# Edit video

Turn user-provided clips — a single clip, several clips, or a whole folder of
raw footage dropped in at once — into a reviewed vertical video without
changing source media. Resolve a project root from `EDIT_VIDEO_ROOT` or a
user-provided path; keep source clips, music, jobs, previews, and final
renders inside that root.

## Workflow

Read [Emotion / intent / pacing](references/emotion-intent-pacing.md) before
the story pass. It defines observable labels, explainable suggestions, privacy
priority, versioned human approval, and (see its "Transition and effect
suggestions" section) how those same labels map to suggested xfade
transitions and visual-emphasis effects — without claiming to infer private
emotional states.

Read [Recommended tools](references/recommended-tools.md) before reaching for
scene-detection, jump-cut, or transcription tooling. It names well-established
OSS options instead of reinventing cut/scene detection, and restates the
install-approval gate below in concrete terms for each tool.

1. **Inventory.** If given a single clip, several clips, or a path to a
   folder (via `EDIT_VIDEO_ROOT` or a user-provided path), inventory every
   raw clip found there into one project — a folder drop-in is a first-class
   entry point, not a one-clip-at-a-time fallback. List each file with
   duration, resolution, and rough content, then make a contact sheet or
   timestamped cut proposal covering the whole set.
2. Get a grade on the proposed story and cuts before rendering a final video.
3. **Narration script (only when narration is wanted and no usable speech
   track exists, or the user asks for narration to be added).** Analyze the
   actual footage — frames plus any existing audio — and auto-draft a short
   narration script structured as four beats: **what** it is, **how** the
   process/mechanism shown works, **where** (the context/location shown), and
   **why** it matters. Keep it a plausible length for a short vertical video
   (a few seconds per beat). Do not invent facts the footage doesn't show.
   Present the drafted script for the same grade/approval gate as step 2
   before it is burned into voice or captions — this is a new artifact under
   that existing gate, not a shortcut around it.
4. Render a low-resolution preview with authored overlays: captions, xfade
   transitions between clips, and visual-emphasis effects (zoom/ken-burns,
   subtle color-grade shift, text-reveal timing), each chosen from the
   emotion/intent/pacing labels per the mapping in
   `references/emotion-intent-pacing.md` rather than applied by default. Keep
   text clear of faces and record every source, in/out point, overlay,
   transition, effect, and command in `cut-list.md`.
5. Add only user-approved music, or the approved narration voice (see
   "Narration voice" below). Use platform-provided music for a live post when
   licensing requires it.
6. Transcribe existing speech only with an available user-approved backend
   (see `references/recommended-tools.md` for a concrete recommendation);
   review the transcript before burning captions.
7. Render the final MP4 only after the preview, narration-script (if used),
   and transcript gates pass.

## Narration voice (optional, one-time setup)

A cloned narration voice is optional and requires the user directly, once,
before it can be reused:

1. Ask the user for explicit consent and a voice sample recording. Do not
   proceed without both.
2. Create the voice clone through the ElevenLabs MCP connector
   (`mcp__claude_ai_ElevenLabs__authenticate` /
   `...__complete_authentication` handle connector auth) or the ElevenLabs
   web dashboard's Instant Voice Cloning flow if the connector does not
   expose a direct clone-creation call — check what the connected account
   actually exposes rather than assuming, and flag it to the user if neither
   path is available. Never use another provider's model for this step: TTS
   and voice cloning here always go through ElevenLabs, never a general
   text/vision model.
3. Store the resulting voice ID (for example alongside the project's other
   config, referencing an `ELEVENLAB_API_KEY`-style environment variable for
   API access rather than hardcoding a key) so it can be reused without
   repeating consent.
4. Once the user has approved a clone as their default narration voice,
   reuse it for future renders without asking again per-render — the same
   "approved once, reused thereafter" pattern used for other one-time media
   approvals, not a silent default before that approval happens.

## Portable defaults

- Use `ffmpeg` and an image renderer such as Pillow when available. Do not
  assume platform-specific filters, fonts, hardware, caches, or disk capacity.
- Ask for a font path or use a font the user provides; do not assume a system
  font.
- Treat transcription as optional. If no approved backend is available, leave
  speech captions out or ask for reviewed text.
- Use preview resolution before final resolution. Choose dimensions, codec,
  bitrate, loudness, and caption timing for the target platform and material.
- Prefer ffmpeg's native `xfade`/`acrossfade` filters for transitions — no new
  dependency needed for that piece.

## Gates

- Never modify source clips.
- Do not install tools (including any OSS tool named in
  `references/recommended-tools.md`), download media, or use copyrighted
  music without the user's approval. Before installing anything, explain what
  the tool does, why this task needs it, and flag it if it was released or
  updated recently, since that can be a supply-chain risk — then wait for a
  yes.
- Never create or use a cloned narration voice without the user's explicit
  consent and a supplied voice sample; never assume a clone already exists.
- Do not present an auto-drafted narration script, transition choice, or
  visual effect as final until the user has graded/approved it — these are
  suggestions, not silent automatic choices.
- Do not claim a render is final until the requested artifacts exist and have
  been reviewed.
- Save `final.mp4` and `cut-list.md` in a new job directory; retain previews
  until the user accepts the final result.

## Clean-room check

Run `python3 scripts/test_fixture_smoke.py` before relying on a new installation.
It creates synthetic media in a temporary directory, renders a caption overlay,
and verifies the MP4 and cut list without using personal footage.
