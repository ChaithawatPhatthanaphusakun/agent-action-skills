import { execSync } from 'node:child_process';

export const checkForUpdates = (repoDir: string): void => {
  try {
    execSync('git fetch origin main --quiet', { cwd: repoDir, stdio: 'ignore', timeout: 5000 });
    const local = execSync('git rev-parse HEAD', { cwd: repoDir }).toString().trim();
    const remote = execSync('git rev-parse origin/main', { cwd: repoDir }).toString().trim();
    if (local !== remote) {
      console.log('\n📦 New features available! Run: fixbill update\n');
    }
  } catch {
    // No network, not a git repo, or git unavailable — skip silently
  }
};
