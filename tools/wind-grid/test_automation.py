"""Concrete scheduling/publication rules; synthetic fields only in tests."""
import datetime as dt
import gzip
import json
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch

from automate import UTC, discover, iso, parse_run, publish, window


class AutomationTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 11, 24, 7, 23, tzinfo=UTC)
        self.run = parse_run("2026112400")

    def fixture(self, root):
        source = {"run": iso(self.run), "retrievedAt": iso(self.now)}
        grid = {"width": 2, "height": 2}
        frames = []
        start = window(self.now, self.run)
        for hour in range(49):
            valid = iso(start + dt.timedelta(hours=hour))
            name = (start + dt.timedelta(hours=hour)).strftime("%Y%m%dT%H%MZ.json.gz")
            data = {"source": source, "grid": grid, "validTime": valid,
                    "u": [1] * 4, "v": [2] * 4, "landFraction": [0] * 4}
            (root / name).write_bytes(gzip.compress(json.dumps(data).encode()))
            frames.append({"validTime": valid, "file": name, "bytes": 1})
        (root / "manifest.json").write_text(json.dumps({"source": source, "grid": grid, "frames": frames}))

    def test_48_hours_are_bracketed_by_49_utc_frames(self):
        start = window(self.now, self.run)
        self.assertEqual(iso(start), "2026-11-24T08:00:00Z")
        self.assertEqual(iso(start + dt.timedelta(hours=48)), "2026-11-26T08:00:00Z")

    def test_stale_run_cannot_cover_next_48_hours(self):
        with self.assertRaises(ValueError):
            window(self.now, parse_run("2026112300"))

    def test_only_official_00_and_12_runs(self):
        with self.assertRaises(ValueError):
            parse_run("2026112406")

    def test_schedule_checks_every_six_hours(self):
        workflow = Path(__file__).parents[2] / ".github/workflows/wind-grid.yml"
        cron = re.search(r"cron: '([^']+)'", workflow.read_text())
        self.assertIsNotNone(cron)
        if cron is None:
            return
        self.assertEqual(cron.group(1).split()[1:], ["*/6", "*", "*", "*"])

    def test_future_run_is_rejected(self):
        with self.assertRaises(ValueError):
            window(self.now, parse_run("2026112412"))

    def test_incomplete_newest_directory_uses_complete_fresh_run(self):
        def complete(run):
            if run == "2026112400":
                raise ValueError("not ready")
            return {}
        with patch("automate.text", return_value='<a href="2026112400/"><a href="2026112312/">'), patch("automate.filenames", side_effect=complete):
            self.assertEqual(discover(self.now), "2026112312")

    def test_incomplete_batch_preserves_previous_manifest(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            converted, site = root / "converted", root / "site"
            converted.mkdir(); site.mkdir()
            (site / "current.json").write_text("previous")
            self.fixture(converted)
            (converted / "20261126T0800Z.json.gz").unlink()
            with self.assertRaises(FileNotFoundError):
                publish(converted, site, self.now)
            self.assertEqual((site / "current.json").read_text(), "previous")
            self.assertFalse((site / "runs").exists())

    def test_publish_plain_json_content_addressed_and_49_frames(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); converted = root / "converted"; converted.mkdir()
            self.fixture(converted)
            current = publish(converted, root / "site", self.now)
            self.assertEqual(len(current["frames"]), 49)
            first = current["frames"][0]
            self.assertTrue(first["file"].endswith(first["sha256"] + ".json"))
            self.assertEqual(json.loads((root / "site" / first["file"]).read_text())["u"], [1, 1, 1, 1])


if __name__ == "__main__":
    unittest.main()