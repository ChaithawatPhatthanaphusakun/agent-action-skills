# edit-video

A portable, review-gated workflow for turning user-provided clips into a
captioned vertical video with a reproducible cut list. Source media stays
unchanged; previews, music, transcripts, and final renders require explicit
review at their own gates.

## Included

- [SKILL.md](SKILL.md): the tool-neutral editing and approval contract.
- [Emotion / intent / pacing](references/emotion-intent-pacing.md): observable,
  explainable signal-to-edit suggestions with privacy first.
- `scripts/test_fixture_smoke.py`: a synthetic ffmpeg + Pillow smoke test that
  uses no personal footage.

No footage, music, voice sample, transcript, browser state, private work log,
or machine-specific runtime workspace is included.

## Workflow

1. Preserve and inventory the original clips.
2. Grade a contact sheet and timestamped cut proposal.
3. Grade a low-resolution preview with authored overlays.
4. Add only approved/licensed music and reviewed speech captions.
5. Render a new final MP4 plus `cut-list.md` after every prior gate passes.

The model reference suggests keeps, cuts, pauses, captions, zooms, and beat
alignment from observable evidence. It does not infer a person's private
emotional state and it never promotes a proposal without human approval.

## Requirements

- Python 3.9+
- Pillow
- `ffmpeg` and `ffprobe` on `PATH`
- An optional, user-approved transcription backend when speech captions are
  requested

Run the clean-room test:

```bash
python3 edit-video/scripts/test_fixture_smoke.py
```

## Install

```bash
git clone https://github.com/iampon-p/skills.git
cd skills
python3 scripts/install-skill.py edit-video --dest <skills-directory>
```

The installer fails rather than overwriting an existing installation.
