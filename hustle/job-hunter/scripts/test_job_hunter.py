#!/usr/bin/env python3
"""Standard-library tests for the job-hunter helper scripts."""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

import job_ledger

SCRIPT_DIR = Path(__file__).resolve().parent
LEDGER_SCRIPT = SCRIPT_DIR / "job_ledger.py"
PROFILE_SCRIPT = SCRIPT_DIR / "validate_profile.py"


class JobHunterTests(unittest.TestCase):
    def run_script(
        self, script: Path, *arguments: str
    ) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["python3", str(script), *arguments],
            check=False,
            capture_output=True,
            text=True,
        )

    def test_linkedin_url_is_canonicalized(self) -> None:
        actual = job_ledger.canonical_url(
            "https://www.linkedin.com/jobs/view/4444112397/"
            "?trackingId=private"
        )
        self.assertEqual(
            actual,
            "https://www.linkedin.com/jobs/view/4444112397",
        )

    def test_profile_validation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            profile = Path(directory) / "profile.json"
            profile.write_text(
                json.dumps(
                    {
                        "version": 1,
                        "paths": {"canonical_resume": "/private/resume.md"},
                        "targets": {"roles": ["AI automation developer"]},
                        "constraints": {"remote_only": True},
                        "approvals": {"mode": "review"},
                    }
                ),
                encoding="utf-8",
            )
            result = self.run_script(PROFILE_SCRIPT, str(profile))
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("valid job-hunter profile", result.stdout)

    def test_ledger_lifecycle_and_deduplication(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ledger = root / "ledger.json"
            report = root / "ledger.md"

            result = self.run_script(LEDGER_SCRIPT, "init", str(ledger))
            self.assertEqual(result.returncode, 0, result.stderr)

            add_args = (
                "add",
                str(ledger),
                "--company",
                "Example",
                "--role",
                "AI Developer",
                "--url",
                "https://www.linkedin.com/jobs/view/123/?tracking=x",
                "--source",
                "LinkedIn",
                "--score",
                "82",
                "--status",
                "shortlisted",
                "--follow-up-at",
                "2026-08-01",
            )
            first = self.run_script(LEDGER_SCRIPT, *add_args)
            self.assertEqual(first.returncode, 0, first.stderr)
            second = self.run_script(LEDGER_SCRIPT, *add_args)
            self.assertIn("duplicate", second.stdout)

            records = json.loads(ledger.read_text(encoding="utf-8"))
            self.assertEqual(len(records), 1)
            record_id = records[0]["id"]

            update = self.run_script(
                LEDGER_SCRIPT,
                "update",
                str(ledger),
                record_id[:6],
                "--status",
                "applied",
                "--applied-at",
                "2026-07-29T12:00:00+00:00",
            )
            self.assertEqual(update.returncode, 0, update.stderr)

            due = self.run_script(
                LEDGER_SCRIPT,
                "due",
                str(ledger),
                "--on",
                "2026-08-02",
            )
            self.assertIn("Example", due.stdout)

            export = self.run_script(
                LEDGER_SCRIPT,
                "export-markdown",
                str(ledger),
                str(report),
            )
            self.assertEqual(export.returncode, 0, export.stderr)
            self.assertIn("[Example]", report.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
