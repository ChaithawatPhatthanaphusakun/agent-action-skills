# design-an-interface

Generates multiple radically different interface designs for a module to explore options before implementation.

## What it does

Based on "Design It Twice" — your first idea is unlikely to be the best. The skill spawns 3+ sub-agents in parallel. Each designs a different interface for the same problem with a different constraint (minimize methods, maximize flexibility, optimize for common case, or follow a specific paradigm). Then shows all designs side by side for comparison before you pick one.

## Example

**You type:**
```
/design-an-interface
Design a file-upload module for my app. Callers: web form, API endpoint, CLI tool. Must handle Thai filenames.
```

**What happens:**

1. Skill asks clarifying questions about the module (what it solves, who uses it, key operations, constraints).
2. Spawns 3 sub-agents in parallel, each with a different constraint:
   - Agent 1: "Minimize method count — 1-3 methods max"
   - Agent 2: "Maximize flexibility — support many use cases"
   - Agent 3: "Optimize for the web form case (most common)"
3. Shows each design with interface signature, usage examples, and trade-offs.
4. Compares all designs on simplicity, flexibility, depth, and ease of use.
5. Asks which fits your needs best or suggests combining elements from multiple designs.

## Setup

Nothing to set up.

## Install

```bash
cp -r design-an-interface ~/.claude/skills/
```
