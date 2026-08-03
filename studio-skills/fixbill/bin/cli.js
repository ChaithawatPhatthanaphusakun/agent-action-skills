#!/usr/bin/env node

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const resolveFixMode = require('./resolveFixMode');

const repoDir = fs.realpathSync(path.resolve(__dirname, '..'));
const serverDir = path.resolve(repoDir, 'server');
const command = process.argv[2];

const isWindows = process.platform === 'win32';

// Run a TypeScript entry via the locally-installed tsx, invoked through the
// current node binary. Avoids `npx` (a .cmd shim on Windows that breaks
// spawnSync without a shell) and avoids shell:true (which would mangle
// Thai addresses / paths containing spaces).
function runTsx(args, opts = {}) {
  const tsxCli = path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!fs.existsSync(tsxCli)) {
    console.error(`❌ Could not find tsx at ${tsxCli}`);
    console.error('   Run: npm install --prefix server  (from the fixbill-cli folder)');
    process.exit(1);
  }
  return spawnSync(process.execPath, [tsxCli, ...args], { stdio: 'inherit', ...opts });
}

// For git/npm (safe: no user-provided args). npm is a .cmd shim on Windows,
// so a shell is required there.
function runCmd(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows, ...opts });
}

function showHelp() {
  console.log('');
  console.log('fixbill — PDF invoice fixing tool');
  console.log('');
  console.log('Usage:');
  console.log('  fixbill help                                    แสดงคำสั่งทั้งหมด');
  console.log('  fixbill doctor                                  ตรวจ setup, CLI, server deps, Claude skill');
  console.log('  fixbill update                                  อัพเดต fixbill เป็นเวอร์ชันล่าสุด');
  console.log('  fixbill <file> "<address>"                      แก้ไขที่อยู่ลูกค้า (Bill-to block)');
  console.log('  fixbill <file> --title "<text>"                 เปลี่ยนชื่อเอกสาร (ไม่ต้องระบุวันที่)');
  console.log('  fixbill <file> --invoice "xxxx-xxx"             แก้ไขเลขที่ใบแจ้งหนี้ / Invoice number');
  console.log('  fixbill <file> "<DD/MM/YYYY>"                   แก้ไขวันที่ออกบิล');
  console.log('  fixbill <file> --receipt "xxx-xxx-xxx"          แก้ไขเลขที่ใบเสร็จ / Receipt number');
  console.log('  fixbill <file> --due "<DD/MM/YYYY>"             แก้ไขวันที่ครบกำหนดชำระ');
  console.log('  fixbill <file> --date-paid "<DD/MM/YYYY>"      แก้ไขวันที่ชำระเงิน (Date paid)');
  console.log('  fixbill <file> --logo <image-path>              เปลี่ยนโลโก้บริษัทมุมขวาบน (รองรับ PNG และ JPEG)');
  console.log('');
  console.log('Address layout note:');
  console.log('  File paths with spaces are supported when the file already exists.');
  console.log('  Windows supports PowerShell/CMD paths and Git Bash /c/Users/... paths.');
  console.log('  Terminal mode prints address rows exactly as provided.');
  console.log('  If an address needs line breaks, pass them yourself, for example:');
  console.log("  fixbill receipt.pdf $'บริษัท A จำกัด\\n123 ถ.สุขุมวิท\\nกทม. 10110\\nTH VAT 0000000000000'");
  console.log('  In Claude/Codex, /fixbill can restructure a pasted single-line address before calling this CLI.');
  console.log('');
  console.log('Google Drive:');
  console.log('  This CLI only saves locally (~/Downloads). Google Drive save only happens');
  console.log('  when run through the Claude or Codex /fixbill skill, via their Drive connector.');
  console.log('  บันทึกเข้า Google Drive ได้เฉพาะตอนรันผ่าน /fixbill ใน Claude หรือ Codex เท่านั้น');
  console.log('');
  console.log('📝 หมายเหตุสำคัญ:');
  console.log('  คำสั่ง --due, --invoice, และ --receipt จะทำงานได้ **ก็ต่อเมื่อ** มีคำนั้นพิมพ์อยู่บนเอกสารเดิมเท่านั้น');
  console.log('  (เช่น ไม่สามารถใช้ --due กับใบเสร็จรับเงินที่ไม่มีคำว่า Due Date อยู่บนกระดาษได้)');
  console.log('');
  }

function showDoctor() {
  const checks = [
    {
      label: 'Platform',
      ok: true,
      value: `${process.platform} ${process.arch}`,
    },
    {
      label: 'Node',
      ok: true,
      value: process.version,
    },
    {
      label: 'fixbill repo',
      ok: fs.existsSync(path.join(repoDir, 'package.json')),
      value: repoDir,
    },
    {
      label: 'server deps',
      ok: fs.existsSync(path.join(serverDir, 'node_modules', 'tsx', 'dist', 'cli.mjs')),
      value: path.join(serverDir, 'node_modules'),
    },
    {
      label: 'Claude skill',
      ok: fs.existsSync(path.join(require('os').homedir(), '.claude', 'skills', 'fixbill', 'SKILL.md')),
      value: path.join(require('os').homedir(), '.claude', 'skills', 'fixbill', 'SKILL.md'),
    },
  ];

  if (isWindows) {
    const policyResult = spawnSync('powershell', ['-NoProfile', '-Command', 'Get-ExecutionPolicy'], { encoding: 'utf-8', shell: true });
    const policy = (policyResult.stdout || '').trim();
    checks.push({
      label: 'PowerShell ExecutionPolicy',
      ok: !['Restricted', 'Undefined', 'AllSigned'].includes(policy),
      value: policy
        ? `${policy}${['Restricted', 'Undefined', 'AllSigned'].includes(policy) ? ' — run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser (or use cmd)' : ''}`
        : 'unknown',
    });
  }

  console.log('');
  console.log('fixbill doctor');
  console.log('');
  for (const check of checks) {
    console.log(`${check.ok ? '✅' : '❌'} ${check.label}: ${check.value}`);
  }

  const failed = checks.filter(check => !check.ok);
  if (failed.length > 0) {
    console.log('');
    if (failed.every(check => check.label === 'PowerShell ExecutionPolicy')) {
      console.log('Fix: the ExecutionPolicy line above shows its own fix.');
    } else {
      console.log('Fix: run `npm run setup` from the fixbill-cli repo, then reopen Claude Code.');
    }
    process.exit(1);
  }

  console.log('');
  console.log('Ready. `fixbill help` and Claude Code `/fixbill` should work.');
}

function parseInvocation(rawArgs, userCwd) {
  // Terminal shells split unquoted paths at spaces. Recover by finding the
  // longest existing path prefix, then treat the rest as the fix arguments.
  for (let i = rawArgs.length - 1; i >= 1; i--) {
    const candidatePath = rawArgs.slice(0, i).join(' ');
    const resolvedCandidatePath = resolveUserPath(userCwd, candidatePath);
    if (fs.existsSync(resolvedCandidatePath)) {
      return {
        pdfPath: resolvedCandidatePath,
        fixArgs: rawArgs.slice(i),
      };
    }
  }

  return {
    pdfPath: rawArgs[0],
    fixArgs: rawArgs.slice(1),
  };
}

function resolveUserPath(userCwd, userPath) {
  if (isWindows) {
    const gitBashDrivePath = userPath.match(/^\/([a-zA-Z])\/(.*)$/);
    if (gitBashDrivePath) {
      return `${gitBashDrivePath[1]}:\\${gitBashDrivePath[2].replace(/\//g, '\\')}`;
    }
  }

  return path.resolve(userCwd, userPath);
}

  if (command === 'help' || command === '--help' || command === '-h') {
  showHelp();
  process.exit(0);
  }

  if (command === 'doctor') {
  showDoctor();
  process.exit(0);
  }

  if (command === 'update') {
  const pull = runCmd('git', ['pull', 'origin', 'main'], { cwd: repoDir });
  if ((pull.status ?? 1) !== 0) process.exit(pull.status ?? 1);
  const install = runCmd('npm', ['install', '--prefix', 'server', '--silent'], { cwd: repoDir });
  if ((install.status ?? 1) !== 0) process.exit(install.status ?? 1);
  console.log('✅ fixbill updated successfully!');
  process.exit(0);
  }

  const userCwd = process.cwd();
  const rawArgs = process.argv.slice(2);
  const { pdfPath, fixArgs } = parseInvocation(rawArgs, userCwd);

  if (!pdfPath || !fixArgs[0]) {
  showHelp();
  process.exit(1);
  }

  const decision = resolveFixMode(fixArgs);

  if (decision.mode === 'error') {
    console.error('\n❌ Error: The address must be wrapped in quotation marks (" ").');
    console.error('   ' + decision.message);
    console.error('   Example: fixbill doc.pdf "บริษัท ABC จำกัด ที่อยู่ 123" --due "18/05/2026"\n');
    process.exit(1);
  }

  if (decision.mode === 'combined') {
    console.log('Starting fixbill (address + field fix)...');
    const args = [
      'scripts/fixall.ts',
      userCwd,
      pdfPath,
      decision.address,
      ...(decision.date ? [decision.date] : []),
      ...decision.flagArgs,
    ];
    const result = runTsx(args, { cwd: serverDir });
    process.exit(result.status ?? 0);
  }

  if (decision.mode === 'fields') {
    console.log('Starting fixbill (field fix)...');
    const result = runTsx(
      ['scripts/fixfields.ts', userCwd, pdfPath, decision.firstArg, ...decision.extraFlags],
      { cwd: serverDir }
    );
    process.exit(result.status ?? 0);
  }

  if (decision.mode === 'address') {
    console.log('Starting fixbill (address fix)...');
    const result = runTsx(
      ['scripts/fixbill.ts', userCwd, pdfPath, decision.address],
      { cwd: serverDir }
    );
    process.exit(result.status ?? 0);
  }
