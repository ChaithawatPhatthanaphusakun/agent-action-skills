# Video Doc Guide

A portable specification for producing trustworthy product walkthrough videos. It keeps product evidence, consent, privacy redaction, marker/caption verification, and versioned review artifacts while leaving capture and rendering tools selectable. Provenance is documented in [PROVENANCE.md](PROVENANCE.md); publication still requires an explicit owner decision.

## Configure a run

Provide product and flow, approved environment and authentication method, platform, output language, theme tokens, voice provider and consent, capture dimensions, and output root. See [SKILL.md](SKILL.md) for the full contract.

## What this extraction includes

- a renderer-agnostic workflow and PASS/FAIL/INCONCLUSIVE evidence gate;
- [adapter configuration](fixtures/adapter-config.example.yaml), [steps](fixtures/steps.example.md), and [review-manifest](fixtures/review-manifest.example.json) examples;
- independently implemented macOS and Android adapter helpers under `scripts/`;
- no product credentials, production URLs, bundled browser automation, or video renderer.

The mobile helpers passed syntax and fail-closed tests but have not been
validated against a real device. Treat them as experimental until a reviewed
device run exists.

## Suggested artifact layout

```text
<output-root>/<feature>/<version>/
  steps.md
  voiceover.md
  privacy-check.md
  review-manifest.json
  review-frames/
  final.mp4
```

The final video is only a delivery artifact after the manifest and review frames support it. Every fixture defaults to draft-only: select the approved app/package and browser profile, calibrate against source display geometry, verify the foreground target, and obtain explicit confirmation before capture, tap, or send.

## Local publication gate

The repository includes a read-only, fail-closed publication gate. It scans all
reachable history—not only the current files—for secrets, personal data,
absolute home paths, private denylist terms, symlinks, unexpected authors,
`refs/original`, branch drift, dirty state, and remote mismatch. Diagnostics
name the affected object and path without echoing the sensitive value.

Create a private one-term-per-line denylist inside Git metadata so it can never
be committed:

```bash
git rev-parse --git-path publication-denylist
git config publication.allowedAuthorEmail \
  '<account-id>+<account>@users.noreply.github.com'
```

Then verify the local-only preparation:

```bash
./scripts/verify_publication.sh --local-only
```

After an `origin` is deliberately configured, require its exact repository
identity:

```bash
./scripts/verify_publication.sh \
  --expected-origin '<owner>/video-doc-guide'
```

The command never creates a remote, commits, or pushes. A PASS is evidence that
the checked state satisfies the local gate; publication remains a separate,
explicitly approved action.
