# edit-video

Turn raw footage into captioned, music-backed vertical reels without dragging clips onto a timeline.

## What it does

Takes raw vertical video clips (DJI, iPhone, etc.), cuts them to beats, burns captions via transcription, mixes music, and renders a final MP4. Uses ffmpeg + Pillow for text overlay and mlx-whisper for speech-to-caption transcription. Outputs a machine-readable cut-list so edits are reproducible and tweaks are fast.

The workflow is a 5-loop grading process: contact-sheet → cut proposal → preview render → music mix → final render. Each loop has you grade an artifact and the skill advances.

## Example

**You type:**
```
/edit-video
I have 30 minutes of raw footage from a product shoot. Need a 30-45 second vertical reel with captions.
```

**What happens:**

1. Skill organizes clips into `~/work/active/edit-video/jobs/<job-name>/` and creates a `CLIPS.md` decoder table.
2. Generates contact-sheet thumbnails of all raw clips, asks you to mark ★ best moments.
3. Loop 1: Renders cut proposal (numbered thumbnails with in/out marks). You reply "drop clip 4, trim clip 7 to 0:15–0:45".
4. Loop 2: Low-res preview with text overlays. You grade the flow, reply with second numbers to adjust.
5. Loop 3: Asks for a music file. Renders preview with music bed, asks "rhythm and energy — A good, B needs tighter cuts, C start over".
6. Transcribes speech from original audio, shows you the transcript, asks "approve for burn-in?"
7. Loop 4: Full-res `final.mp4` + human-readable `cut-list.md` with every ffmpeg command.
8. Shares the final reel.

## Setup

Requires:
- `ffmpeg` 8.0+ (via `brew install ffmpeg`)
- Python 3.9+ with `Pillow` and `numpy`
- `mlx-whisper` for speech transcription — **Apple Silicon (M1/M2/M3) only**. Install via:
  ```bash
  pip install mlx-whisper
  ```

For non-Apple Silicon Macs, use another transcription API (Deepgram, AssemblyAI) or skip speech captions.

## Install

```bash
git clone https://github.com/iampon-p/edit-video.git edit-video-skill
ln -s "$(pwd)/edit-video-skill" ~/.claude/skills/edit-video
```

Keep the public skill repository separate from the private runtime workspace:

```text
~/work/active/
├── edit-video/          # private footage, music, jobs, and renders
└── edit-video-skill/    # public skill repository
```

The included `.gitignore` blocks common footage, audio, render, and runtime
directories from entering the public repository.
