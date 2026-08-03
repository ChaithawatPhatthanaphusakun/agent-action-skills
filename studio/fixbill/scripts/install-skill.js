#!/usr/bin/env node
// Installs the fixbill Claude Code skill into ~/.claude/skills/fixbill/
// Cross-platform (macOS / Linux / Windows) — no bash required.

const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const skillSrc = path.join(repoRoot, 'SKILL.md');

const skillDestDir = path.join(os.homedir(), '.claude', 'skills', 'fixbill');
const skillDest = path.join(skillDestDir, 'SKILL.md');

console.log('📦 Installing fixbill skill for Claude Code...');

if (!fs.existsSync(skillSrc)) {
  console.error(`❌ Could not find source skill at: ${skillSrc}`);
  console.error('   Did you run this from inside the fixbill-cli repo?');
  process.exit(1);
}

fs.mkdirSync(skillDestDir, { recursive: true });
fs.copyFileSync(skillSrc, skillDest);

console.log(`✅ Installed: ${skillDest}`);
console.log('');
console.log('🎉 Done. Open Claude Code in any folder and type /fixbill to use it.');
