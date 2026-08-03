# Video Doc Guide

A portable specification for producing trustworthy product walkthrough videos.
It keeps product evidence, consent, privacy redaction, marker/caption review,
and versioned artifacts explicit while leaving capture and rendering tools
selectable.

## This public package contains

- [SKILL.md](SKILL.md), the renderer-agnostic workflow and its fail-closed
  evidence rules.
- No credentials, production URLs, private recordings, voice assets, browser
  state, product-specific automation, device-control helpers, or renderer.

The repository's MIT license applies to the included text. It does not grant
rights to third-party product interfaces, brand assets, recordings, voices, or
customer data used during a real guide.

## Configure a run

Provide the approved product and flow, environment and authentication method,
platform, output language, theme tokens, voice provider and consent, capture
dimensions, and output root. See [SKILL.md](SKILL.md) for the full contract.

## Expected private run artifacts

```text
<output-root>/<feature>/<version>/
  steps.md
  voiceover.md
  privacy-check.md
  review-manifest.json
  review-frames/
  final.mp4
```

Those artifacts remain outside this public package. A final video is deliverable
only after the manifest and review frames prove the approved target, privacy
redactions, markers, captions, and audio.
