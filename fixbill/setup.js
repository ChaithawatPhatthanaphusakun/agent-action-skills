const { spawnSync } = require('child_process');
const path = require('path');

console.log('====================================================');
console.log('🚀 Welcome to FixBill AI Setup!');
console.log('====================================================\n');

// 1. Link the CLI command
console.log('📦 Setting up the "FixBill" global command...');
const linkResult = spawnSync('npm', ['link'], { stdio: 'inherit', shell: true });

if (linkResult.status !== 0) {
  console.error('\n❌ Failed to setup "FixBill" command globally.');
  console.error('You may need to run this command with sudo: sudo npm run setup');
  process.exit(1);
}

console.log('\n✅ "FixBill" command setup successfully!\n');

// Windows PowerShell blocks the fixbill.ps1 shim when ExecutionPolicy is
// Restricted ("running scripts is disabled on this system"). Detect and tell
// the user how to fix it before they hit the error.
if (process.platform === 'win32') {
  const policyResult = spawnSync('powershell', ['-NoProfile', '-Command', 'Get-ExecutionPolicy'], { encoding: 'utf-8', shell: true });
  const policy = (policyResult.stdout || '').trim();
  if (policy === 'Restricted' || policy === 'Undefined' || policy === 'AllSigned') {
    console.log('⚠️  Windows PowerShell ExecutionPolicy = ' + (policy || 'unknown'));
    console.log('   Running "fixbill" in PowerShell may fail with:');
    console.log('   "fixbill.ps1 cannot be loaded because running scripts is disabled on this system"');
    console.log('');
    console.log('   Fix (run once in PowerShell, no admin needed):');
    console.log('   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser');
    console.log('');
    console.log('   Or use Command Prompt (cmd) instead of PowerShell — no policy change needed.');
    console.log('');
  }
}

// 2. Setup Server Dependencies
console.log('📦 Installing server dependencies...');
const installServerResult = spawnSync('npm', ['install'], { 
  cwd: path.resolve(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

if (installServerResult.status !== 0) {
  console.error('\n❌ Failed to install server dependencies.');
  process.exit(1);
}
console.log('\n✅ Server dependencies installed!\n');


// 3. Install Claude Code skill (so /FixBill works in any Claude Code session)
console.log('🧠 Installing Claude Code skill + /FixBill slash command...');
const installSkillResult = spawnSync(process.execPath, [path.resolve(__dirname, 'scripts/install-skill.js')], {
  stdio: 'inherit',
  shell: false
});

if (installSkillResult.status !== 0) {
  console.log('\n⚠️ Skill install was skipped or failed. You can run "npm run install-skill" later.');
} else {
  console.log('\n✅ Claude Code skill installed!\n');
}


// 4. Print Usage Guide
console.log('\n====================================================');
console.log('🎉 FixBill AI is Ready!');
console.log('====================================================\n');
console.log('You can now use the FixBill command from ANY folder in your terminal!\n');

console.log('📖 How to fix a bill (Terminal):');
console.log('1. Open your terminal.');
console.log('2. Type "FixBill ", then drag the PDF onto the terminal window.');
console.log('3. Add the new address in double quotes, then hit Enter.');
console.log('   File paths with spaces are supported when the file already exists.');
console.log('   Windows supports PowerShell/CMD paths and Git Bash /c/Users/... paths.');
console.log('   Terminal mode prints address rows exactly as provided.');
console.log('   If you need clean address rows, add the line breaks yourself.');
console.log('\n   FixBill <filename.pdf> "<New Corrected Address>"\n');

console.log('💡 Example:');
console.log('   FixBill receipt.pdf "123 New Street, Bangkok 10110"\n');
console.log('   FixBill receipt.pdf $\'บริษัท A จำกัด\\n123 ถ.สุขุมวิท\\nกทม. 10110\\nTH VAT 0000000000000\'\n');

console.log('🤖 How to fix a bill (Claude Code / Codex):');
console.log('   Open Claude Code or Codex anywhere, type "/fixbill", drop the PDF, paste the address.');
console.log('   Claude/Codex can restructure a single-line unstructured address before calling the CLI.\n');

console.log('🧪 Verify setup:');
console.log('   FixBill doctor\n');

console.log('What will happen?');
console.log(' - The file will be processed and the address will be updated.');
console.log(' - A new file named "<original>_edit.pdf" will be saved to your Downloads folder.');
console.log(' - Google Drive save only happens when run via the Claude/Codex /fixbill skill');
console.log('   (through their Drive connector) — plain terminal use stays local-only.\n');

console.log('====================================================');
