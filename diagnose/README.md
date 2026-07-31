# diagnose

Runs a structured debugging loop for hard bugs that won't quit.

## What it does

Walks through 6 phases: build a feedback loop (failing test, curl, CLI script, or browser automation), reproduce the bug, generate ranked hypotheses, instrument code, apply the fix, then regression-test. Each phase has clear checkpoints. Refuses to guess — if you cannot build a reproducible loop, the skill stops and asks for environment access or captured logs instead of proceeding blind.

## Example

**You type:**
```
/diagnose
Auth tokens expire every 5 minutes even though the server says they're valid for 1 hour.
```

**What happens:**

1. **Phase 1 — Build feedback loop:** Writes a failing test or curl script that reproduces the token expiry. "Does the token expire at 5 minutes consistently?"
2. **Phase 2 — Reproduce:** Runs the test. Confirms token dies at exactly 5 minutes.
3. **Phase 3 — Hypothesize:** Generates 3-5 ranked guesses (e.g. "Token expiry check uses < instead of <=", "Server sets wrong max-age header", "Client clock skew").
4. **Phase 4 — Instrument:** Adds targeted logs around token validation. Tests each hypothesis.
5. **Phase 5 — Fix:** Finds the bug (token check is `if (now > expiry)` instead of `if (now >= expiry)`). Writes regression test. Applies fix. Verifies test passes.
6. **Phase 6 — Cleanup:** Removes debug logs. Re-runs original test. Documents the root cause in the commit.

## Setup

Nothing to set up.

## Install

```bash
cp -r diagnose ~/.claude/skills/
```
