---
name: social-update
description: Comprehensive social media update, content strategy, copy generation, and visual/video production engine. Combines professional presence management, post drafting, copywriting, content strategy, launch strategy, marketing ideas, email/inbox replies, and HyperFrames video generation into an all-in-one privacy-safe social update workflow across LinkedIn, Twitter/X, GitHub, YouTube, and email.
---

# Social Update

Consolidated social content, personal branding, and creative production engine. Orchestrates content strategy, copywriting, video generation, launch announcements, and inbox responses into a single privacy-safe pipeline.

## Consolidated Skill Capabilities

This skill integrates the following core capabilities:
- **Professional Presence & Profile Audits**: Audits and refines LinkedIn/GitHub profiles, headlines, bios, and pins using verified public evidence.
- **Content Strategy & Marketing Ideas**: Generates topic clusters, editorial calendars, value propositions, and growth tactics tailored to your target audience.
- **Copywriting**: Writes high-converting post copy, hooks, CTAs, landing page copy, and social announcements.
- **Launch Strategy**: Plans feature announcements, Product Hunt launches, waitlist campaigns, and Product Updates.
- **Visual & Video Production**:
  - `hyperframes` (entry point) + `hyperframes-core` + `hyperframes-animation` + `hyperframes-cli` + `hyperframes-registry` + `hyperframes-keyframes`: Authors and renders programmatic HTML/GSAP motion graphics and title cards.
  - `general-video` & `hero-image`: Produces feature hero assets, brand sizzle reels, and social media banners.
  - `media-use`: Resolves BGM, SFX, voiceovers, transcriptions, and background removal into output assets.
- **Inbox & Reply Operations**: `inbox-replies` — Classifies incoming emails, comments, and direct messages, and drafts privacy-reviewed response packets.

## Non-negotiable boundaries

- Exclude personal data that is not required for the approved action, credentials, precise location or routines, private conversations, and private deliberations.
- Exclude employer, customer, workplace, private-repository, non-public analytics, and unreleased information in every language, including Thai.
- Never invent experience, student status, eligibility, results, testimonials, project activity, issues, releases, or credentials.
- Use public personal repositories and approved portfolio artifacts as evidence.
- Treat uncertainty as a stop condition. Ask for approval before posting or sending any message.

## Workflows

### 1. Social Post Creation & Scheduling
1. Scan public project evidence and recent achievements.
2. Select target platform (LinkedIn, Twitter/X, GitHub Discussion/Release).
3. Apply `content-strategy` & `copywriting`: Structure hook → problem → solution → takeaway → CTA.
4. Render optional visual/video header via `hyperframes` or `hero-image`.
5. Output structured review packet for human approval before publishing.

### 2. Launch Announcement Campaign
1. Define product/feature launch brief using `launch-strategy`.
2. Generate copy for Product Hunt, LinkedIn post, Twitter thread, and launch email.
3. Render launch video demo or hero image.
4. Output complete launch kit.

### 3. Profile & Presence Audit
1. Audit headline, bio, experience, GitHub pins, and portfolio links.
2. Provide side-by-side before/after recommendations.
3. Apply changes only upon explicit user approval.

## Setup

Requires standard Node.js & HyperFrames CLI setup if rendering video assets (`npx hyperframes check`).

## Install

```bash
cp -r social-update ~/.claude/skills/
```
