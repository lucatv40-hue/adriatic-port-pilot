"""Offline GRIB preprocessing; not imported by the web app or its Worker.

Usage: python convert.py --u U.grib --v V.grib --land FR_LAND.grib
  --run 2026112400 --bbox 12 43 15 46 --start 2026-11-24T07:00:00Z
  --retrieved-at 2026-11-24T06:18:13Z --hours 48 --output /tmp/wind-tiles
Inputs must be complete original files from the same official model run.
"""
import argparse
import datetime as dt
import gzip
import json
from pathlib import Path

import numpy as np
from eccodes import codes_get, codes_get_values, codes_grib_new_from_file, codes_release

BASE = "https://meteohub.agenziaitaliameteo.it/nwp/ICON-2I_SURFACE_PRESSURE_LEVELS/"
UTC = dt.timezone.utc


def iso(value):
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def read(path, short_name, run, bbox, wanted):
    frames, geometry = {}, None
    with open(path, "rb") as stream:
        while (message := codes_grib_new_from_file(stream)) is not None:
            try:
                if codes_get(message, "shortName") != short_name:
                    raise ValueError("Unexpected GRIB variable")
                if codes_get(message, "dataDate") != int(run.strftime("%Y%m%d")) or codes_get(message, "dataTime") != run.hour * 100:
                    raise ValueError("Mixed model runs")
                if codes_get(message, "gridType") != "regular_ll" or codes_get(message, "iScansNegatively") != 0 or codes_get(message, "jScansPositively") != 1 or codes_get(message, "jPointsAreConsecutive") != 0 or codes_get(message, "alternativeRowScanning") != 0:
                    raise ValueError("Unsupported geographic scan; remapping required")
                if short_name != "lsm":
                    if codes_get(message, "units") != "m s**-1" or codes_get(message, "level") != 10 or codes_get(message, "typeOfLevel") != "heightAboveGround" or codes_get(message, "uvRelativeToGrid") != 0:
                        raise ValueError("Expected earth-relative wind at 10 metres in m/s")
                elif codes_get(message, "units") != "(0 - 1)":
                    raise ValueError("Invalid land fraction units")
                valid = dt.datetime.strptime(str(codes_get(message, "validityDate")) + f'{codes_get(message, "validityTime"):04d}', "%Y%m%d%H%M").replace(tzinfo=UTC)
                if short_name != "lsm" and valid not in wanted:
                    continue
                nx, ny = int(codes_get(message, "Ni")), int(codes_get(message, "Nj"))
                west, south = codes_get(message, "longitudeOfFirstGridPointInDegrees"), codes_get(message, "latitudeOfFirstGridPointInDegrees")
                dx, dy = codes_get(message, "iDirectionIncrementInDegrees"), codes_get(message, "jDirectionIncrementInDegrees")
                left, bottom, right, top = bbox
                if left < west or bottom < south or right > west + (nx - 1) * dx or top > south + (ny - 1) * dy:
                    raise ValueError("Requested area outside model coverage")
                x0, x1 = int(np.floor((left-west)/dx)), min(nx-1, int(np.ceil((right-west)/dx)))
                y0, y1 = int(np.floor((bottom-south)/dy)), min(ny-1, int(np.ceil((top-south)/dy)))
                grid = {"west": round(west+x0*dx, 6), "south": round(south+y0*dy, 6), "dx": dx, "dy": dy, "width": x1-x0+1, "height": y1-y0+1, "order": "south-to-north-row-major"}
                if grid["width"] < 2 or grid["height"] < 2 or grid["width"] * grid["height"] > 100_000:
                    raise ValueError("Tile must contain 2D nodes and at most 100000 values")
                # Source extent is included to catch misaligned U/V/land inputs.
                current = (nx, ny, west, south, dx, dy, grid)
                if geometry is not None and geometry != current:
                    raise ValueError("Changing grid geometry")
                geometry = current
                values = codes_get_values(message).reshape(ny, nx)[y0:y1+1, x0:x1+1].ravel()
                missing = codes_get(message, "missingValue")
                data = [None if not np.isfinite(x) or x == missing else round(float(x), 4) for x in values]
                if short_name == "lsm" and any(x is not None and not 0 <= x <= 1 for x in data):
                    raise ValueError("Land mask out of range")
                if valid in frames:
                    raise ValueError("Duplicate validity time")
                frames[valid] = data
            finally:
                codes_release(message)
    if not frames or geometry is None:
        raise ValueError("Empty GRIB selection")
    return frames, geometry


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ["u", "v", "land", "run", "start", "retrieved-at", "output"]:
        parser.add_argument("--"+flag, required=True)
    parser.add_argument("--bbox", nargs=4, type=float, required=True, metavar=("WEST", "SOUTH", "EAST", "NORTH"))
    parser.add_argument("--hours", type=int, default=48)
    args = parser.parse_args()
    run = dt.datetime.strptime(args.run, "%Y%m%d%H").replace(tzinfo=UTC)
    start = dt.datetime.fromisoformat(args.start.replace("Z", "+00:00"))
    retrieved = dt.datetime.fromisoformat(args.retrieved_at.replace("Z", "+00:00"))
    if retrieved.tzinfo is None or retrieved < run or retrieved > dt.datetime.now(UTC):
        raise ValueError("Require actual UTC-aware download timestamp")
    if start.tzinfo is None or start.minute or start.second or start.microsecond or not 1 <= args.hours <= 48 or run.hour not in [0, 12]:
        raise ValueError("Require UTC-aware hourly start, 1–48 hours, run 00/12 UTC")
    start = start.astimezone(UTC)
    if not all(np.isfinite(args.bbox)) or args.bbox[0] >= args.bbox[2] or args.bbox[1] >= args.bbox[3]:
        raise ValueError("Invalid bounding box")
    wanted = {start+dt.timedelta(hours=h) for h in range(args.hours+1)}
    if min(wanted) < run or max(wanted) > run + dt.timedelta(hours=72):
        raise ValueError("Time outside ICON-2I coverage")
    u, ug = read(args.u, "10u", run, args.bbox, wanted)
    v, vg = read(args.v, "10v", run, args.bbox, wanted)
    land, lg = read(args.land, "lsm", run, args.bbox, wanted)
    if ug != vg or ug != lg or set(u) != wanted or set(v) != wanted or len(land) != 1:
        raise ValueError("Incomplete or mismatched U/V/mask; no output published")
    mask = next(iter(land.values()))
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    source = {"model": "icon2i", "run": iso(run), "retrievedAt": iso(retrieved), "attribution": "Agenzia ItaliaMeteo / Arpae Emilia-Romagna", "license": "CC BY 4.0", "url": BASE+args.run+"/"}
    entries = []
    for valid in sorted(wanted):
        data = {"version": 1, "source": source, "validTime": iso(valid), "heightMetres": 10, "units": "m/s", "vectors": "earth-relative", "grid": ug[-1], "u": u[valid], "v": v[valid], "landFraction": mask}
        name = valid.strftime("%Y%m%dT%H%MZ") + ".json.gz"
        payload = json.dumps(data, separators=(",", ":"), allow_nan=False).encode()
        (output/name).write_bytes(gzip.compress(payload, mtime=0))
        entries.append({"validTime": iso(valid), "file": name, "bytes": (output/name).stat().st_size})
    # Manifest is written last; serving/deployment is intentionally not configured.
    (output/"manifest.json").write_text(json.dumps({"source": source, "grid": ug[-1], "frames": entries}, indent=2))
    print(f"Validated {len(entries)} hourly frames, {ug[-1]['width']} × {ug[-1]['height']} geographic nodes")


if __name__ == "__main__":
    main()