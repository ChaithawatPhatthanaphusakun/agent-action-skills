---
name: video-doc-guide
description: Use for requests to create privacy-safe, product-true screen-recorded product walkthroughs, video guides, or video manuals with reviewable, versioned evidence.
---

# Video documentation guide

## Establish the recording contract

Require the operator to supply:

- The product and the complete flow from its normal entry point to visible success.
- The approved environment and explicit consent to use its authentication and access.
- The platform, product terminology, and language.
- Visual tokens for markers, captions, redaction, and closing frames.
- The voice provider and explicit voice consent when narration is used.
- Source capture width, height, and constant frame rate.
- The renderer and output root.

Never infer credentials, access, authentication state, or consent. Stop when any required approval is missing. Keep synthetic or mocked product output labeled as a draft; do not present it as product-true evidence.

## Produce the guide

1. Record the real product flow from its normal entry point.
2. Add a title and enough context to orient the viewer.
3. Guide each action with source-space markers and captions. Add synchronized narration only when configured and consented.
4. Redact private content across every complete frame, including motion and transitions.
5. End on the visible success state, then add a concise closing or result.
6. Keep every revision under a versioned artifact directory.

Create these artifacts:

- `steps.md`
- `voiceover.md` when narration is used
- `privacy-check.md`
- `review-manifest.json`
- Deterministically named review frames
- The final video

In `review-manifest.json`, record the artifact version, source dimensions and frame rate, renderer, narration configuration, review-frame timestamps and hashes, privacy decisions, validation results, and final video path.

## Validate before reporting

Verify:

- The final resolution matches the configured resolution.
- The video uses the configured constant frame rate.
- Audio is present when narration or other audio is configured.
- Marker coordinates originate in source space and map correctly after rendering.
- Redaction remains complete during transitions, scrolling, animation, and cuts.
- The flow begins at the normal entry point and ends with visible success.
- The reviewed video is the same version identified by the manifest and artifact path.

Report exactly one machine-readable outcome:

- `RESULT: PASS` — only after reviewing the final video; include its artifact path.
- `RESULT: FAIL <reason>` — identify failed checks and evidence.
- `RESULT: INCONCLUSIVE <reason>` — identify missing evidence or approval.

## Use optional adapters

- Use `scripts/mirror.sh` only for explicitly confirmed macOS iPhone Mirroring actions.
- Use `scripts/setup-scrcpy.sh` to prepare Android prerequisites; it performs no device action.

Treat every capture and control adapter as optional. Never perform a device action unless the operator explicitly confirms that action.
