"""External scheduled acquisition and atomic publication; never imported by the app."""
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

BASE = "https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/"
UTC = dt.timezone.utc
VARIABLES = ("U_10M", "V_10M", "FR_LAND")


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_run(value):
    if not re.fullmatch(r"\d{10}", value):
        raise ValueError("Invalid run identifier")
    run = dt.datetime.strptime(value, "%Y%m%d%H").replace(tzinfo=UTC)
    if run.hour not in (0, 12):
        raise ValueError("Expected official 00/12 UTC run")
    return run


def window(now, run):
    start = now.astimezone(UTC).replace(minute=0, second=0, microsecond=0)
    if start < now:
        start += dt.timedelta(hours=1)
    end = start + dt.timedelta(hours=48)
    if run > now or end > run + dt.timedelta(hours=72):
        raise ValueError("No fresh run covering the next 48 hours")
    return start


def request(url):
    # URLs are constructed exclusively from fixed official origin and validated names.
    for attempt in range(3):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={
                "User-Agent": "Rotta-Adriatica-wind-grid/1.0"
            }), timeout=90)
        except (OSError, TimeoutError):
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def text(url):
    with request(url) as response:
        return response.read(2_000_000).decode("utf-8")


def filenames(run):
    parse_run(run)
    result = {}
    for variable in VARIABLES:
        links = re.findall(r'href="([^"/]+\.grib)"', text(f"{BASE}{run}/{variable}/"))
        expected = f"ICON_2I_SURFACE_PRESSURE_LEVELS_{run}_"
        matches = [name for name in links if name.startswith(expected)
                   and re.fullmatch(r"[A-Za-z0-9_.-]+", name)]
        if len(matches) != 1:
            raise ValueError(f"Missing or ambiguous {variable} file")
        result[variable] = matches[0]
    return result


def discover(now):
    candidates = sorted(set(re.findall(r'href="(\d{10})/"', text(BASE))), reverse=True)
    for candidate in candidates:
        try:
            window(now, parse_run(candidate))
            filenames(candidate)
            return candidate
        except (ValueError, OSError):
            continue
    raise ValueError("Official source has no complete fresh 48-hour run")


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def acquire(run, cache):
    directory = cache / run
    directory.mkdir(parents=True, exist_ok=True)
    metadata = directory / "download.json"
    if metadata.exists():
        saved = json.loads(metadata.read_text())
        if saved.get("run") == run and all(
            (directory / f"{variable}.grib").is_file()
            and digest(directory / f"{variable}.grib") == saved.get("sha256", {}).get(variable)
            for variable in VARIABLES
        ):
            return directory, saved["retrievedAt"]
    names = filenames(run)
    checksums = {}
    for variable, name in names.items():
        target = directory / f"{variable}.grib"
        partial = target.with_suffix(".part")
        try:
            with request(f"{BASE}{run}/{variable}/{name}") as response, partial.open("wb") as stream:
                count = 0
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > 200_000_000:
                        raise ValueError("Oversized official input")
                    stream.write(chunk)
                declared = response.headers.get("Content-Length")
                if declared and count != int(declared):
                    raise ValueError("Truncated GRIB download")
            with partial.open("rb") as stream:
                if stream.read(4) != b"GRIB":
                    raise ValueError("Not a GRIB input")
                stream.seek(-4, 2)
                if stream.read() != b"7777":
                    raise ValueError("Incomplete final GRIB message")
            partial.replace(target)
            checksums[variable] = digest(target)
        finally:
            partial.unlink(missing_ok=True)
    retrieved = iso(dt.datetime.now(UTC))
    metadata.write_text(json.dumps({"run": run, "retrievedAt": retrieved, "sha256": checksums}))
    return directory, retrieved


def publish(converted, site, now):
    """Validate the entire batch before switching current.json; keep immutable frames."""
    manifest = json.loads((converted / "manifest.json").read_text())
    run = dt.datetime.fromisoformat(manifest["source"]["run"].replace("Z", "+00:00"))
    start = window(now, run)
    frames = manifest["frames"]
    expected = [iso(start + dt.timedelta(hours=h)) for h in range(49)]
    if [frame["validTime"] for frame in frames] != expected:
        raise ValueError("Publication must bracket exactly the next 48 hours")
    payloads = []
    run_name = run.strftime("%Y%m%d%H")
    for frame in frames:
        name = frame["file"]
        if not re.fullmatch(r"\d{8}T\d{4}Z\.json\.gz", name):
            raise ValueError("Unsafe frame path")
        payload = gzip.decompress((converted / name).read_bytes())
        data = json.loads(payload)
        count = manifest["grid"]["width"] * manifest["grid"]["height"]
        if (data["source"] != manifest["source"] or data["grid"] != manifest["grid"]
                or data["validTime"] != frame["validTime"] or not 4 <= count <= 100_000
                or any(len(data[key]) != count for key in ("u", "v", "landFraction"))):
            raise ValueError("Incomplete or mismatched publication")
        sha = hashlib.sha256(payload).hexdigest()
        relative = f"runs/{run_name}/{name[:-3].removesuffix('.json')}-{sha}.json"
        payloads.append((relative, payload))
        frame.update({"file": relative, "bytes": len(payload), "sha256": sha})
    site.mkdir(parents=True, exist_ok=True)
    for relative, payload in payloads:
        destination = site / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and destination.read_bytes() != payload:
            raise ValueError("Immutable frame collision")
        destination.write_bytes(payload)
    current = {"version": 1, "publishedAt": iso(now), **manifest}
    pending = site / "current.pending"
    pending.write_text(json.dumps(current, separators=(",", ":")))
    pending.replace(site / "current.json")
    (site / "index.html").write_text('<!doctype html><html lang="it"><title>Vento – Rotta Adriatica</title><p>Dati ICON-2I: Agenzia ItaliaMeteo / Arpae Emilia-Romagna. CC BY 4.0. Ritaglio e conversione U/V; previsioni, non osservazioni.</p><a href="current.json">Previsioni disponibili</a></html>')
    (site / ".nojekyll").touch()
    # Preserve old frame URLs for 72h (site is restored from the prior successful job).
    for directory in (site / "runs").iterdir():
        if directory.is_dir() and parse_run(directory.name) < now - dt.timedelta(hours=72):
            shutil.rmtree(directory)
    return current


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--discover", action="store_true")
    parser.add_argument("--run")
    parser.add_argument("--cache", type=Path, default=Path(".wind-cache"))
    parser.add_argument("--site", type=Path, default=Path(".wind-site"))
    args = parser.parse_args()
    now = dt.datetime.now(UTC)
    if args.discover:
        run = discover(now)
        print(run)
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as stream:
                stream.write(f"run={run}\n")
        return
    run = args.run or discover(now)
    window(now, parse_run(run))
    directory, retrieved = acquire(run, args.cache)
    # Take a new clock reading after acquisition, not a stale scheduled timestamp.
    now = dt.datetime.now(UTC)
    start = window(now, parse_run(run))
    with tempfile.TemporaryDirectory() as staging:
        command = [sys.executable, str(Path(__file__).with_name("convert.py")),
                   "--run", run, "--retrieved-at", retrieved, "--start", iso(start),
                   "--hours", "48", "--bbox", "12", "43", "15", "46", "--output", staging]
        for flag, variable in zip(("u", "v", "land"), VARIABLES):
            command.extend([f"--{flag}", str(directory / f"{variable}.grib")])
        subprocess.run(command, check=True)
        current = publish(Path(staging), args.site, now)
    print(f"Ready: {len(current['frames'])} frames, run {run}; no account data included")


if __name__ == "__main__":
    main()