"""Scarica onde Copernicus Marine (Mediterraneo, 4.2 km, orarie) per l'Alto Adriatico
e scrive waves.json compatto nella cartella pubblicata su gh-pages."""
import json, math, os, sys, datetime as dt
import copernicusmarine

out_dir = sys.argv[1] if len(sys.argv) > 1 else ".wind-site"
now = dt.datetime.now(dt.timezone.utc).replace(minute=0, second=0, microsecond=0)
ds = copernicusmarine.open_dataset(
    dataset_id="cmems_mod_med_wav_anfc_4.2km_PT1H-i",
    variables=["VHM0", "VMDR"],
    minimum_longitude=12.0, maximum_longitude=15.0,
    minimum_latitude=43.8, maximum_latitude=45.85,
    start_datetime=(now - dt.timedelta(hours=1)).isoformat(),
    end_datetime=(now + dt.timedelta(hours=49)).isoformat(),
)
lat = ds["latitude"].values; lon = ds["longitude"].values
def clean(v, nd):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), nd)
times, H, D = [], [], []
for i, t in enumerate(ds["time"].values):
    times.append(str(t)[:19] + "Z")
    h = ds["VHM0"].isel(time=i).values; d = ds["VMDR"].isel(time=i).values
    H.append([clean(x, 1) for x in h.flatten().tolist()])
    D.append([clean(x, 0) for x in d.flatten().tolist()])
grid = {"source": "Copernicus Marine Service (CMEMS MED-Waves)", "lat0": float(lat[0]), "lon0": float(lon[0]),
        "dLat": float(lat[1] - lat[0]), "dLon": float(lon[1] - lon[0]), "ny": len(lat), "nx": len(lon),
        "times": times, "h": H, "d": D, "generatedAt": now.isoformat()}
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "waves.json"), "w") as f:
    json.dump(grid, f, separators=(",", ":"))
print("waves.json", len(times), "ore", len(lat), "x", len(lon))
