---
name: edit-video
description: Edit short vertical videos with a local ffmpeg-based workflow: propose cuts, create captioned previews, mix approved music, and render an MP4 with a readable cut list. Use when asked to edit raw clips, add captions, or make a vertical reel.
---

# Edit video

Turn user-provided clips into a reviewed vertical video without changing source
media. Resolve a project root from `EDIT_VIDEO_ROOT` or a user-provided path;
keep source clips, music, jobs, previews, and final renders inside that root.

## Workflow

Read [Emotion / intent / pacing](references/emotion-intent-pacing.md) before
the story pass. It defines observable labels, explainable suggestions, privacy
priority, and versioned human approval without claiming to infer private
emotional states.

1. Inventory clips and make a contact sheet or timestamped cut proposal.
2. Get a grade on the proposed story and cuts before rendering a final video.
3. Render a low-resolution preview with authored overlays. Keep text clear of
   faces and record every source, in/out point, overlay, and command in
   `cut-list.md`.
4. Add only user-approved music. Use platform-provided music for a live post
   when licensing requires it.
5. Transcribe speech only with an available user-approved backend; review the
   transcript before burning captions.
6. Render the final MP4 only after the preview and transcript gates pass.

## Portable defaults

- Use `ffmpeg` and an image renderer such as Pillow when available. Do not
  assume platform-specific filters, fonts, hardware, caches, or disk capacity.
- Ask for a font path or use a font the user provides; do not assume a system
  font.
- Treat transcription as optional. If no approved backend is available, leave
  speech captions out or ask for reviewed text.
- Use preview resolution before final resolution. Choose dimensions, codec,
  bitrate, loudness, and caption timing for the target platform and material.

## Gates

- Never modify source clips.
- Do not install tools, download media, or use copyrighted music without the
  user’s approval.
- Do not claim a render is final until the requested artifacts exist and have
  been reviewed.
- Save `final.mp4` and `cut-list.md` in a new job directory; retain previews
  until the user accepts the final result.

## Clean-room check

Run `python3 scripts/test_fixture_smoke.py` before relying on a new installation.
It creates synthetic media in a temporary directory, renders a caption overlay,
and verifies the MP4 and cut list without using personal footage.
