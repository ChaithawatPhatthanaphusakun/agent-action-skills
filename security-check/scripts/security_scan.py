#!/usr/bin/env python3
"""
Security scanner — scans a file for common security issues and tech debt.
Zero LLM calls. Pure regex. No dependencies beyond the standard library.

Usage:
    python3 security_scan.py <file_or_dir_path>
    python3 security_scan.py ./my_script.py
    python3 security_scan.py ./some-project

Optional: to also get a Telegram alert when HIGH findings appear, set both
SECURITY_SCAN_TELEGRAM_TOKEN and SECURITY_SCAN_TELEGRAM_CHAT (this needs the
`requests` package). Unset, the scanner is offline-only.
"""
import re
import sys
import os
from pathlib import Path

# Optional Telegram alerting. Entirely opt-in: set both env vars to enable it.
# Left unset (the default), the scanner just prints its report and never
# touches the network.
TELEGRAM_TOKEN = os.environ.get("SECURITY_SCAN_TELEGRAM_TOKEN", "")
TELEGRAM_CHAT = os.environ.get("SECURITY_SCAN_TELEGRAM_CHAT", "")

# Patterns: (name, severity, regex, description)
PATTERNS = [
    # HIGH — secrets
    ("hardcoded_token",    "HIGH", r'(?:token|api_key|apikey|secret|password|passwd|credential)\s*=\s*["\'][A-Za-z0-9+/=_\-]{8,}["\']', "Hardcoded secret value"),
    ("telegram_token",     "HIGH", r'\d{8,10}:AA[A-Za-z0-9_\-]{33}', "Telegram bot token pattern"),
    ("slack_token",        "HIGH", r'xox[bpas]-[A-Za-z0-9\-]+', "Slack token pattern"),
    ("env_secret",         "HIGH", r'(?:SECRET|PASSWORD|TOKEN|API_KEY)\s*=\s*["\'](?!your_|<|xxx|dummy|test)[A-Za-z0-9]{8,}', "Env secret possibly hardcoded"),
    # HIGH — dangerous code
    ("eval_input",         "HIGH", r'eval\(input\(', "eval with input() — remote code execution risk"),
    ("exec_input",         "HIGH", r'exec\(input\(', "exec with input() — remote code execution risk"),
    ("shell_true",         "HIGH", r'subprocess\.[a-z_]+\([^)]*shell\s*=\s*True', "subprocess shell=True — command injection risk"),
    # MEDIUM — code quality
    ("os_system",          "MEDIUM", r'os\.system\(', "os.system() — prefer subprocess"),
    ("todo_hack",          "MEDIUM", r'#\s*(?:TODO|FIXME|HACK|XXX)\b', "Tech debt marker"),
    ("insecure_http",      "MEDIUM", r'http://(?!localhost|127\.0\.0\.1|0\.0\.0\.0)', "Insecure HTTP URL (not HTTPS)"),
    # LOW — style issues
    ("print_debug",        "LOW",    r'print\(["\']DEBUG', "Debug print statement"),
    ("commented_code",     "LOW",    r'^\s*#.*(?:import |def |class )', "Commented-out code"),
]

SKIP_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".svg", ".ico", ".pdf",
                   ".lock", ".json", ".env", ".plist", ".DS_Store"}
SKIP_DIRS = {"node_modules", ".git", "__pycache__", "venv", ".venv",
             ".next", "dist", "build", "site-packages", ".cache",
             # bundler/vendor output
             "assets", "out", ".output", "coverage", "vendor", "Pods",
             # macOS / third-party tool dirs (not your own code)
             "Library", ".Trash", "Applications", "Google Drive",
             ".pyenv", ".conda", ".npm", ".npm-global", ".docker",
            ".vscode", ".vscode-shared", ".cursor", ".codex", ".gemini",
            ".qwen", ".copilot", ".aider", ".factory", ".kilocode",
            ".kimi", ".kimi-code", ".local", ".config", ".homebrew",
            ".playwright-mcp", ".zsh_sessions", ".mamba", ".swiftpm",
            "marketplaces"}  # ~/.claude/plugins/marketplaces = third-party

# Dummy/test values that look like secrets but aren't
FAKE_VALUE_RE = re.compile(
    r'["\'](?:test|dummy|fake|example|sample|placeholder|your_|xxx|<)'
    r'|["\'](?:refresh_token|access_token|id_token|api_key|client_secret|secret_key)["\']',
    re.IGNORECASE)

# Test-fixture files: secrets in them are fixtures, downgrade skip
TEST_FILE_RE = re.compile(r'(?:\.test\.|\.spec\.|_test\.|/tests?/|/__tests__/|/fixtures?/)')


def is_minified(path: Path, content: str) -> bool:
    """Bundled/minified JS — third-party, unreadable, all false positives."""
    if path.suffix.lower() not in {".js", ".mjs", ".cjs"}:
        return False
    if ".min." in path.name or re.search(r'-[A-Za-z0-9_\-]{8}\.js$', path.name):
        return True
    lines = content.splitlines() or [""]
    return max(len(l) for l in lines) > 5000 or len(content) / len(lines) > 500

# Only these file types are scanned in directory mode (single-file mode scans anything)
SCAN_EXTENSIONS = {".py", ".sh", ".js", ".ts", ".tsx", ".jsx", ".zsh", ".bash",
                   ".rb", ".php", ".go", ".yaml", ".yml", ".toml"}


def should_skip(path: Path) -> bool:
    if path.suffix.lower() in SKIP_EXTENSIONS:
        return True
    if any(part in SKIP_DIRS for part in path.parts):
        return True
    # Skip env files (they're supposed to have secrets)
    if path.name.endswith(".env") or path.name.startswith(".env"):
        return True
    return False


def scan_file(file_path: str) -> list[dict]:
    p = Path(file_path).expanduser()
    if not p.exists() or not p.is_file():
        return []
    if should_skip(p):
        return []
    try:
        content = p.read_text(errors="ignore")
    except Exception:
        return []
    if is_minified(p, content):
        return []
    is_test = bool(TEST_FILE_RE.search(str(p)))

    findings = []
    seen_secret_lines = set()  # dedupe: one secret finding per line
    for name, severity, pattern, description in PATTERNS:
        secret_rule = name in {"hardcoded_token", "env_secret",
                               "slack_token", "telegram_token"}
        for i, line in enumerate(content.splitlines(), 1):
            if not re.search(pattern, line, re.IGNORECASE):
                continue
            if secret_rule:
                if is_test or FAKE_VALUE_RE.search(line):
                    continue
                if (str(p), i) in seen_secret_lines:
                    continue
                seen_secret_lines.add((str(p), i))
            findings.append({
                "file": str(p),
                "line": i,
                "severity": severity,
                "rule": name,
                "description": description,
                "snippet": line.strip()[:80],
            })
    return findings


def scan_dir(dir_path: str) -> list[dict]:
    root = Path(dir_path).expanduser()
    findings = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if Path(fn).suffix.lower() in SCAN_EXTENSIONS:
                findings.extend(scan_file(os.path.join(dirpath, fn)))
    return findings


def send_telegram(msg: str):
    if not (TELEGRAM_TOKEN and TELEGRAM_CHAT):
        return
    try:
        import requests

        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT, "text": msg, "parse_mode": "HTML"},
            timeout=5,
        )
    except Exception:
        pass


def main():
    if len(sys.argv) < 2:
        print("Usage: security_scan.py <file_path>")
        sys.exit(0)

    file_path = sys.argv[1]
    target = Path(file_path).expanduser()
    if target.is_dir():
        findings = scan_dir(file_path)
    elif target.is_file():
        findings = scan_file(file_path)
    else:
        print(f"Path not found: {file_path}")
        sys.exit(1)

    if not findings:
        print(f"✅ Clean: {file_path}")
        return

    high = [f for f in findings if f["severity"] == "HIGH"]
    medium = [f for f in findings if f["severity"] == "MEDIUM"]
    low = [f for f in findings if f["severity"] == "LOW"]

    # Always print findings to terminal
    file_name = Path(file_path).name
    print(f"\n🔍 Security scan: {file_name}")
    dir_mode = target.is_dir()
    for f in findings:
        icon = "🔴" if f["severity"] == "HIGH" else "🟡" if f["severity"] == "MEDIUM" else "⚪"
        loc = f"{f['file']}:{f['line']}" if dir_mode else f"L{f['line']}"
        print(f"  {icon} {loc}: [{f['rule']}] {f['description']}")
        print(f"     {f['snippet'][:60]}")

    # Send Telegram alert only for HIGH findings
    if high:
        alert = f"🚨 <b>Security Alert</b> — <code>{file_name}</code>\n\n"
        for f in high[:5]:
            loc = f"{Path(f['file']).name}:{f['line']}" if dir_mode else f"Line {f['line']}"
            alert += f"🔴 {loc}: <b>{f['rule']}</b>\n"
            alert += f"   <code>{f['snippet'][:60]}</code>\n\n"
        if len(high) > 5:
            alert += f"...and {len(high)-5} more HIGH findings\n"
        alert += f"\n📊 Total: {len(high)} HIGH · {len(medium)} MEDIUM · {len(low)} LOW"
        send_telegram(alert)


if __name__ == "__main__":
    main()
