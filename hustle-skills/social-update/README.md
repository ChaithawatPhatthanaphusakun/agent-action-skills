# social-update

Consolidated social content, personal branding, copywriting, and visual/video production engine.

## What it does

Orchestrates your entire social presence, content marketing, and creative production pipeline into a single unified skill. Integrates content strategy, copywriting, launch planning, inbox reply drafting, and motion graphics video generation (HyperFrames engine) with strict privacy boundaries.

## Visual Pipeline

```mermaid
flowchart TD
    Input[Public Work / Product Launch / Idea] --> Strategy[Content & Launch Strategy]
    Strategy --> Copy[Copywriting & Hook Generation]
    Copy --> Media{Need Visual / Video?}
    Media -->|Yes| HyperFrames[HyperFrames & Hero Image Generator]
    Media -->|No| Review[Review Packet]
    HyperFrames --> Review
    Review --> Inbox[Inbox & Comment Reply Handler]
    Inbox --> Deliver([Approved Post & Media Output])
```

## Features

- **Profile & Presence Management**: Audits headlines, bios, GitHub pins, and portfolio presentation.
- **Copywriting & Content Strategy**: Drafts engaging social posts, launch announcements, and Twitter/X threads.
- **Motion Graphics & Video**: Integrates HyperFrames CLI, GSAP animation rules, hero images, and media resolution.
- **Inbox & Reply Automation**: Classifies incoming messages and drafts privacy-safe responses.

## Setup

No mandatory dependencies beyond standard browser, GitHub CLI, or HyperFrames CLI (for video rendering).

## Install

```bash
cp -r social-update ~/.claude/skills/
```
