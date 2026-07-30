#!/usr/bin/env python3
"""In-process tests for the immutable, public-evidence review-packet gate."""

from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("build_review_packet.py")
FIXTURE = Path(__file__).parents[1] / "tests" / "fixtures" / "public-skills-evidence.md"
SPEC = importlib.util.spec_from_file_location("review_gate", SCRIPT)
assert SPEC and SPEC.loader
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


class ReviewPacketTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "skills"
        self.root.mkdir()
        shutil.copy(FIXTURE, self.root / "README.md")
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        subprocess.run(["git", "-C", str(self.root), "config", "user.email", "test@example.invalid"], check=True)
        subprocess.run(["git", "-C", str(self.root), "config", "user.name", "Test"], check=True)
        subprocess.run(["git", "-C", str(self.root), "add", "README.md"], check=True)
        subprocess.run(["git", "-C", str(self.root), "commit", "-qm", "fixture"], check=True)
        subprocess.run(["git", "-C", str(self.root), "remote", "add", "origin", "https://github.com/iampon-p/skills.git"], check=True)
        self.draft = Path(self.temp.name) / "draft.md"
        self.draft.write_text("Problem → approach → decisions → result → lesson → evidence.", encoding="utf-8")
        self.output = Path(self.temp.name) / "review_packet.json"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def args(self, *extra: str) -> list[str]:
        return [
            "--repo-root", str(self.root), "--evidence", "README.md",
            "--draft", str(self.draft),
            "--account", "https://www.linkedin.com/in/example-profile/",
            "--audience", "anyone",
            "--recruiter-benefit", "Shows evidence-backed engineering judgment.",
            "--media", "no-media",
            "--employer-data", "none", "--customer-data", "none",
            "--analytics-data", "none", "--private-data", "none",
            "--unreleased-data", "none", "--output", str(self.output), *extra,
        ]

    def run_gate(self, *extra: str) -> int:
        with patch.object(GATE, "verify_public_commit", return_value=True):
            return GATE.main(self.args(*extra))

    def test_immutable_preview_is_deterministic(self) -> None:
        self.assertEqual(self.run_gate(), 0)
        first = self.output.read_bytes()
        packet = json.loads(first)
        self.assertEqual(packet["publication"], "not_authorized")
        self.assertTrue(packet["approval_required"])
        self.assertEqual(packet["preview"]["media"], {"mode": "no-media", "files": []})
        self.assertEqual(packet["preview"]["audience"], "anyone")
        self.assertEqual(packet["preview"]["account"], "https://www.linkedin.com/in/example-profile/")
        self.assertIn("engineering judgment", packet["preview"]["recruiter_benefit"])
        self.assertEqual(packet["classifications"]["analytics_data"], "none")
        self.assertIn("Problem", packet["preview"]["text"])
        self.assertEqual(len(packet["preview"]["links"]), 1)
        self.assertEqual(len(packet["preview_sha256"]), 64)
        self.output.unlink()
        self.assertEqual(self.run_gate(), 0)
        self.assertEqual(first, self.output.read_bytes())

    def test_rejects_publish_and_existing_output(self) -> None:
        self.assertEqual(self.run_gate("--action", "publish"), 2)
        self.assertFalse(self.output.exists())
        self.assertEqual(self.run_gate(), 0)
        self.assertEqual(self.run_gate(), 2)

    def test_rejects_dirty_and_untracked_evidence(self) -> None:
        (self.root / "README.md").write_text("changed", encoding="utf-8")
        self.assertEqual(self.run_gate(), 2)
        subprocess.run(["git", "-C", str(self.root), "checkout", "--", "README.md"], check=True)
        (self.root / "untracked.md").write_text("public evidence", encoding="utf-8")
        self.assertEqual(self.run_gate("--evidence", "untracked.md"), 2)

    def test_rejects_symlinks_and_private_classes(self) -> None:
        (self.root / "linked.md").symlink_to(self.root / "README.md")
        self.assertEqual(self.run_gate("--evidence", "linked.md"), 2)
        (self.root / "aliased").symlink_to(self.root)
        self.assertEqual(self.run_gate("--evidence", "aliased/README.md"), 2)
        self.draft.write_text("Call me at +1 415 555 0123", encoding="utf-8")
        self.assertEqual(self.run_gate(), 2)

    def test_privacy_classes_and_public_verification_fail_closed(self) -> None:
        for value in (
            "123 Example Street", "13.7563, 100.5018", "traveling to Oslo",
            "every morning at 08:00", "passport: A1234567", "recovery code: abc",
            "customer: Acme", "unreleased: project", "token: abcdefgh",
            "analytics results showed conversion data",
            "for our customer",
        ):
            self.assertFalse(GATE.text_is_safe(value), value)
        with patch.object(GATE, "verify_public_commit", return_value=False):
            self.assertEqual(GATE.main(self.args()), 2)
        self.assertFalse(self.output.exists())

    def test_rejects_uncertain_classification_and_invalid_account(self) -> None:
        self.assertEqual(self.run_gate("--analytics-data", "uncertain"), 2)
        self.assertEqual(self.run_gate("--account", "https://linkedin.example/profile"), 2)
        self.assertFalse(self.output.exists())

    def test_external_media_is_hashed_into_preview(self) -> None:
        media = Path(self.temp.name) / "portfolio.png"
        media.write_bytes(b"public image fixture")
        self.assertEqual(self.run_gate("--media", str(media)), 0)
        packet = json.loads(self.output.read_text())
        manifest = packet["preview"]["media"]
        self.assertEqual(manifest["mode"], "files")
        self.assertEqual(manifest["files"][0]["filename"], "portfolio.png")
        self.assertEqual(manifest["files"][0]["size_bytes"], len(b"public image fixture"))
        self.assertEqual(len(manifest["files"][0]["sha256"]), 64)

    def test_rejects_non_public_origin_and_output_inside_repo(self) -> None:
        subprocess.run(["git", "-C", str(self.root), "remote", "set-url", "origin", "https://example.invalid/private.git"], check=True)
        self.assertEqual(self.run_gate(), 2)
        subprocess.run(["git", "-C", str(self.root), "remote", "set-url", "origin", "https://github.com/iampon-p/skills.git"], check=True)
        self.output = self.root / "packet.json"
        self.assertEqual(self.run_gate(), 2)


if __name__ == "__main__":
    unittest.main()
