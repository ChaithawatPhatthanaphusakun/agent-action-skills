#!/usr/bin/env python3
"""Regression tests for repository validation and safe installation."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent


def load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


VALIDATOR = load("validator", "validate-skills.py")
INSTALLER = load("installer", "install-skill.py")


class RepositoryToolTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "repo"
        self.root.mkdir()
        for document in VALIDATOR.REQUIRED_ROOT_DOCS:
            (self.root / document).write_text(f"# {document}\n", encoding="utf-8")
        for category in VALIDATOR.CATEGORIES:
            directory = self.root / category
            directory.mkdir()
            (directory / "README.md").write_text(f"# {category}\n", encoding="utf-8")
        package = self.root / "dev" / "example-skill"
        package.mkdir()
        (package / "SKILL.md").write_text(
            "---\nname: example-skill\ndescription: Example test skill.\n---\n\n# Example\n",
            encoding="utf-8",
        )
        (self.root / "SKILLS.md").write_text(
            "# Inventory\n\n| Install path | Status | Dependencies | Notes |\n"
            "| --- | --- | --- | --- |\n"
            "| `dev/example-skill` | curated | none | fixture |\n",
            encoding="utf-8",
        )

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_valid_fixture_and_placeholder_paths(self) -> None:
        (self.root / "README.md").write_text(
            "Use /Users/<user>/path/to/project or /home/<username>/path/to/project.\n",
            encoding="utf-8",
        )
        self.assertEqual(VALIDATOR.main([str(self.root)]), 0)

    def test_rejects_generic_home_paths_and_secret(self) -> None:
        mac_path = "/" + "Users/alice/private.txt"
        linux_path = "/" + "home/bob/private.txt"
        token = "ghp_" + "7Kp4Qz9Lm2Nx8Vr6"
        (self.root / "README.md").write_text(
            f"{mac_path}\n{linux_path}\ncredential={token}\n", encoding="utf-8"
        )
        self.assertEqual(VALIDATOR.main([str(self.root)]), 1)

    def test_rejects_missing_root_doc_unknown_binary_and_inventory_mismatch(self) -> None:
        (self.root / "AGENTS.md").unlink()
        (self.root / "dev" / "example-skill" / "asset.bin").write_bytes(b"\x00\x01")
        (self.root / "SKILLS.md").write_text("# Inventory\n", encoding="utf-8")
        self.assertEqual(VALIDATOR.main([str(self.root)]), 1)

    def test_installer_refuses_source_symlink_and_overwrite(self) -> None:
        destination = Path(self.temp.name) / "installed"
        destination.mkdir()
        args = ["dev/example-skill", "--root", str(self.root), "--dest", str(destination)]
        self.assertEqual(INSTALLER.main(args), 0)
        self.assertEqual(INSTALLER.main(args), 3)
        alias = self.root / "dev" / "alias"
        alias.symlink_to(self.root / "dev" / "example-skill", target_is_directory=True)
        alias_args = ["dev/alias", "--root", str(self.root), "--dest", str(destination)]
        self.assertEqual(INSTALLER.main(alias_args), 2)


if __name__ == "__main__":
    unittest.main()
