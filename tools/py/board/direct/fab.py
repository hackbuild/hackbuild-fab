"""Fab set packaging for the direct route (M08-T06 step 2, the D-052 zip
rules applied to the fab zip): members sorted by name, no directory
entries, one fixed deflate level, every member's mtime from the epoch the
caller passes (clamped to 1980-01-01, the first date a zip can hold), unix
attributes 0644 on a unix host record. Two runs under one epoch write one
sha256.
"""
import datetime
import os
import zipfile

ZIP_EPOCH_FLOOR = 315532800  # 1980-01-01T00:00:00Z, the earliest zip mtime
DEFLATE_LEVEL = 9


def zip_time(epoch):
    t = datetime.datetime.fromtimestamp(max(int(epoch), ZIP_EPOCH_FLOOR), tz=datetime.timezone.utc)
    return (t.year, t.month, t.day, t.hour, t.minute, t.second)


def write_zip(zip_path, members, epoch):
    """members: [(name in the zip, bytes)]. Written in name order."""
    dt = zip_time(epoch)
    with zipfile.ZipFile(zip_path, "w") as z:
        for name, data in sorted(members, key=lambda m: m[0]):
            info = zipfile.ZipInfo(name, date_time=dt)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            z.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=DEFLATE_LEVEL)


def fab_members(fab_dir, suffixes=(".gbr", ".drl")):
    """Every file in fab_dir with one of the suffixes, as (name, bytes)."""
    out = []
    for fn in sorted(os.listdir(fab_dir)):
        if fn.endswith(suffixes):
            with open(os.path.join(fab_dir, fn), "rb") as f:
                out.append((fn, f.read()))
    return out
