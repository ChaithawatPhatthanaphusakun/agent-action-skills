---
name: edit-video
description: Edit short vertical videos via ffmpeg pipeline — cut raw clips, burn captions, add speech transcription, apply music, render final MP4 with a readable cut-list. Use when you need to edit a clip, add captions to video, or make a reel from raw footage.
---

# /edit-video

Purpose: save editing time. Raw clips → captioned, hooked, music-backed,
ready-to-post vertical reel with minimal manual timeline work.

> STATUS: Phase 1 workflow established. Loop process includes cut proposal,
> low-res preview render, music mix with captions, and full-res final render.
> Style spec locked from grading rounds.

## Project layout

- Project dir: `~/work/active/edit-video/`
- Source clips: `~/work/active/edit-video/source-clips/` — descriptive names;
  `CLIPS.md` there = decoder table (content notes, ★best moments, original
  names). Update it whenever new footage arrives or clips are renamed.
- Music: `~/work/active/edit-video/music/` (user supplies the music pick; YouTube link →
  `yt-dlp -x --audio-format mp3`)
- Jobs: `~/work/active/edit-video/jobs/<job-name>/` — one folder per reel

## Loop process (locked — target rounds per reel)

| Loop | Step | Artifact to grade | Target |
|------|------|--------------------|--------|
| 0 | Contact-sheet all raw clips → update `CLIPS.md` | — (cached per shoot) | once |
| 1 | Cut proposal: numbered thumbnails + in/out + beat | `proposal-vN.png` — grade by number ("drop 4, trim 7") | 1–2 |
| 2 | Low-res preview render + text overlays | `feedback-sheet-vN.png` (1 frame/sec, labeled) — grade by second | 1–2 |
| 3 | Music mix + speech captions | preview with music | 1–2 |
| 4 | Full-res final + cut-list | verify only | 1 |

Loop advancement rule: do not mark a loop passed from notes alone. The graded
artifact must exist, it must be graded, and the result must be recorded in the
job `cut-list.md`.

## Locked decisions

1. **Final render MP4** — CapCut editability = bonus only. Draft-JSON /
   UI-automation branches are dead.
2. **Toolchain: ffmpeg + Pillow + mlx-whisper.** System ffmpeg 8.1 has NO
   drawtext/subtitles filters — all text renders to transparent PNGs via
   Pillow, composited with `overlay` + `enable='between(t,a,b)'`. Font:
   Sukhumvit Set Bold (`/System/Library/Fonts/Supplemental/SukhumvitSet.ttc`).
   DJI .mov clips have a 2nd preview video stream — always select `v:0`.
   **Note:** mlx-whisper runs on Apple Silicon only.
3. **Two caption layers:**
   - **Punchline pills** (authored): white rounded pill, black text,
     lower third, 2–4s, synced to beat. Additional language sub-pill sometimes.
   - **Speech captions** (transcribed): when people talk clearly on camera,
     mlx-whisper (`mlx-community/whisper-large-v3-turbo`, model cached
     ~1.6GB in ~/.cache/huggingface) transcribes ORIGINAL audio → burn lines at
     speech timestamps. Transcribe the full-res source clip, not
     the preview mix — mall ambient noise drowns faint speech and Whisper
     hallucinates loops ("นะ !"). Review transcript before burn.
4. **Audio:** original audio stripped in final; music bed only.
   `loudnorm=I=-14`, fade in 0.3s / out 1s. Captions carry speech content.
   ⚠️ Commercial tracks: fine in preview; for the real post
   the poster should re-add the song via the platform's music picker (licensing).
5. **Output per job:** `final.mp4` + `cut-list.md` (every cut: src/in/out,
   every overlay + timing, exact ffmpeg commands — the escape hatch).

## Pro-editor gates

- **Story/emotion pass:** pick shots for faces, gestures, interaction, product
  inspection, and payoff. Compress transit/walking into short flashes unless it
  carries the hook.
- **Rhythm pass:** cut to music beats when it increases energy; hold across a
  beat when the human moment needs air. Record track, offset, fades, loudness,
  and exact ffmpeg command.
- **Music grade:** render a low-res music-mixed preview and get a grade on
  rhythm, energy, and mood before full-res output.
- **Speech-caption gate:** transcribe clear-audio segments from the original
  full-res source clips, not the low-res preview or music mix. Reject hallucinated
  loops, impossible timestamps, and text that has not been reviewed.
- **Final gate:** full-res `final.mp4` only after music grade passes and any
  speech transcript has been reviewed for burn-in.

## Style spec (locked from grading rounds)

- **Hook:** duration follows the subject's ACTION (stride at camera = ~1–2s,
  not fixed). ONE-row text: key word in WHITE box (black text) + rest white
  w/ shadow. Long hooks get a 2nd text beat.
- **Taste rules:** transit/walking shots = BORING → compress to 1s flashes
  or cut; shopping/interaction/try-on/faces = keep 4–5s. Motion=keep,
  static=cut. Don't pad to hit a length target — good material only.
- Hard cuts only; pills lower-third, never on faces; CTA pill on the
  smile/closer shot.
- Duration: whatever the good material supports.

## Grading artifacts (make these, don't describe)

- Cut proposal: tiled numbered thumbnails w/ timestamps + beat labels.
- Feedback sheet: 1 frame/sec grid labeled `Ns + segment` — reply
  "remove second 2 and 3".
- Style variants: render options (A/B/C) on the real frame, select one.

## Rules

- Never modify source clips; render to a new output folder per job.
- Preview low-res (540x960 crf26) before any full-res (1080x1920 crf20).
- Every render logs its exact ffmpeg command into `cut-list.md`.
- Nothing new installed without asking first.
- Disk watch: Mac has ~5GB free — clean `~/.cache/huggingface` partials and
  old preview renders when jobs finish.
- Future: editing-technique references (J-cut, match cut, speed ramp) →
  add as `references/techniques.md` in this skill, not separate sub-skills.
