---
name: skill-creator
description: Use when the user wants to create a new Claude skill, scaffold a new skill file, or add a new /command. Guides through creating a properly structured SKILL.md in ~/.claude/skills/<name>/. Also handles updating or improving existing skills, and first checks whether an existing local or published skill should be extended instead.
---

# Skill Creator

Scaffolds new Claude Code skills at `~/.claude/skills/<name>/SKILL.md`.

## Skills Directory

All personal skills live at: `~/.claude/skills/`

## Steps

### Step 0 — Check whether it should be a new skill at all

Before scaffolding anything, do both checks. Most "new skill" requests are really an
existing skill that needs one more argument.

1. **Does one already exist locally?** List `~/.claude/skills/` and read the closest
   match. If an existing skill covers the same job with a different period, target, or
   mode, extend it with an argument instead of creating a sibling folder. Sibling skills
   that differ only by scope (`x`, `x-daily`, `x-weekly`) fragment fast and rot.
2. **Does one already exist publicly?** The `npx skills` CLI searches the open agent
   skills ecosystem — `npx skills find <query>` to search, `npx skills add <package>` to
   install. Installing a maintained skill beats writing a worse copy.

Only continue when you can state in one line why the existing skill can't be extended.
Put that line in the new skill's commit message.

### Step 1 — Understand the skill

Ask the user:
1. What command name? (e.g., `/my-skill`)
2. What does it do? (one sentence)
3. When should it trigger? (what user actions or phrases invoke it?)
4. What tools/APIs does it need? (Telegram, Gmail MCP, Bash scripts, etc.)
5. What's the expected output?

### Step 2 — Create the skill folder

```bash
mkdir -p ~/.claude/skills/<name>
```

### Step 3 — Write SKILL.md

Template:
```markdown
---
name: <skill-name>
description: <one-line description — used for skill matching>
---

# <Skill Title>

<Brief explanation of what the skill does and when to use it.>

## Steps

### Step 1 — ...
### Step 2 — ...
...

## Output

<Describe what the skill produces — Telegram message, file, etc.>
```

Key rules:
- `name:` must match the folder name exactly (lowercase, hyphens)
- `description:` is used by Claude to decide when to invoke the skill — make it specific with trigger phrases
- Steps should be concrete and executable — Claude follows them directly
- Include exact local paths and API call shapes when needed, but never commit
  secret values, chat IDs, bot tokens, webhook URLs, or personal account data.
  Refer to local-only env var names instead.

### Step 4 — Verify

After writing:
1. Confirm the skill file was created at the correct path
2. Tell the user: "Skill `/name` created. You can invoke it by typing `/name` in a new session."
3. If the skill runs scripts, confirm the referenced scripts exist

### Step 5 — Update CLAUDE.md if needed

If the skill is new and not yet documented in `~/CLAUDE.md`, offer to add a one-line entry to the Claude Skills table.
