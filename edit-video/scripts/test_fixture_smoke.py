#!/usr/bin/env python3
"""Render a synthetic captioned clip and reproducible cut list."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def run(command: list[str]) -> None:
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "command failed")


def main() -> int:
    for executable in ("ffmpeg", "ffprobe"):
        if shutil.which(executable) is None:
            raise RuntimeError(f"required executable is missing: {executable}")

    with tempfile.TemporaryDirectory(prefix="edit-video-smoke-") as temp:
        root = Path(temp)
        source = root / "source.mp4"
        overlay = root / "overlay.png"
        output = root / "preview.mp4"
        cut_list = root / "cut-list.md"

        source_command = [
            "ffmpeg", "-y", "-f", "lavfi", "-i",
            "testsrc=size=360x640:rate=24", "-t", "1", "-c:v", "libx264",
            "-pix_fmt", "yuv420p", str(source),
        ]
        run(source_command)

        image = Image.new("RGBA", (360, 640), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        draw.rounded_rectangle((50, 480, 310, 540), radius=18, fill="white")
        draw.text((95, 500), "SMOKE TEST", fill="black", font=ImageFont.load_default())
        image.save(overlay)

        render_command = [
            "ffmpeg", "-y", "-i", str(source), "-i", str(overlay),
            "-filter_complex", "[0:v][1:v]overlay=0:0:enable='between(t,0,1)'[v]",
            "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p",
            str(output),
        ]
        run(render_command)
        run([
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height", "-of", "csv=p=0",
            str(output),
        ])

        cut_list.write_text(
            "# Synthetic smoke-test cut list\n\n"
            "- Source: generated color bars; no personal media\n"
            "- Range: 0.0–1.0 seconds\n"
            "- Overlay: synthetic caption pill\n"
            f"- Render command: `{' '.join(render_command)}`\n",
            encoding="utf-8",
        )

        if output.stat().st_size == 0 or cut_list.stat().st_size == 0:
            raise RuntimeError("expected smoke-test artifacts were not created")

    print("edit-video synthetic smoke test: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
