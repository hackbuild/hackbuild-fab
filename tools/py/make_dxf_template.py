"""The AC1024 skeleton of nest's DXF writer (M07-T06 step 1, D-138).

COTTER kept the header, tables, blocks and objects of its laser DXF as an
ezdxf-made skeleton (designs/cotter/legacy/dxf_template.json, lineage
cotter.dxf-template/r5) and poured closed LWPOLYLINEs into ENTITIES; the
script that made it did not ship. This one writes the same kind of skeleton
with ezdxf.new("R2010", units=4): a LAYER table of ENGRAVE, SCORE,
CUT_INNER, CUT and LIGHT, $INSUNITS 4, $MEASUREMENT 1, an empty ENTITIES
section replaced by {{ENTITIES}} and the $HANDSEED value replaced by
{{SEED}}. The fixed metadata switch of ezdxf pins the GUIDs, the four
date variables carry the Julian date of SOURCE_DATE_EPOCH 315532800
(1980-01-01 00:00 UTC), and the script runs under PYTHONHASHSEED 0 (the
CLASSES order follows it), so one ezdxf version gives one template.

    uv run --project tools/py tools/py/make_dxf_template.py           # compare
    uv run --project tools/py tools/py/make_dxf_template.py --write   # rewrite

Without --write the script compares its output with the committed
packages/nest/data/dxf-template.json and exits 1 on any difference.
Regeneration is a deliberate change, never a build step.
"""
import io, json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "packages", "nest", "data", "dxf-template.json")
EZDXF = "1.4.4"
SOURCE_DATE_EPOCH = 315532800
# Layer order is the LAYER table order; colours are AutoCAD colour indices
# matching the SVG twin (COTTER and GUSSET): engrave black or white, score
# green, both cut layers red, light blue.
LAYERS = [("ENGRAVE", 7), ("SCORE", 3), ("CUT_INNER", 1), ("CUT", 1), ("LIGHT", 5)]
FIRST = 0x100


def build():
    import ezdxf
    from ezdxf.tools import juliandate
    import datetime

    if ezdxf.__version__ != EZDXF:
        raise SystemExit(f"ezdxf {ezdxf.__version__}, the template pins {EZDXF}; change the pin in a deliberate PR")
    ezdxf.options.write_fixed_meta_data_for_testing = True
    doc = ezdxf.new("R2010", units=4)
    doc.header["$MEASUREMENT"] = 1
    for name, aci in LAYERS:
        doc.layers.add(name, color=aci)
    buf = io.StringIO()
    doc.write(buf)
    text = buf.getvalue()
    fixed = repr(juliandate(datetime.datetime(2000, 1, 1, 0, 0)))
    epoch = repr(juliandate(datetime.datetime.fromtimestamp(SOURCE_DATE_EPOCH, datetime.UTC).replace(tzinfo=None)))
    lines = text.split("\n")
    pairs = [(lines[i], lines[i + 1]) for i in range(0, len(lines) - 1, 2)]
    out, var, section, handles, owner, seeded, dated = [], None, None, [], None, 0, 0
    k = 0
    while k < len(pairs):
        code, value = pairs[k]
        c = code.strip()
        if c == "0" and value == "SECTION":
            section = pairs[k + 1][1]
        if section == "ENTITIES" and c == "0" and value == "ENDSEC":
            out.append("{{ENTITIES}}")
            section = None
        if section == "HEADER" and c == "9":
            var = value
        elif section == "HEADER" and var == "$HANDSEED" and c == "5":
            value = "{{SEED}}"
            seeded += 1
        elif section == "HEADER" and var in ("$TDCREATE", "$TDUCREATE", "$TDUPDATE", "$TDUUPDATE") and c == "40":
            if value != fixed:
                raise SystemExit(f"{var} is {value}, expected the fixed date {fixed}")
            value = epoch
            dated += 1
        if c in ("5", "105") and value != "{{SEED}}":
            handles.append(int(value, 16))
        out.append(f"{code}\n{value}\n")
        k += 1
    tpl = "".join(out)
    # the ENTITIES placeholder sits before "  0\nENDSEC" of that section
    if tpl.count("{{ENTITIES}}") != 1 or seeded != 1 or dated != 4:
        raise SystemExit(f"placeholders: ENTITIES {tpl.count('{{ENTITIES}}')}, SEED {seeded}, dates {dated}; expected 1, 1, 4")
    if max(handles) >= FIRST:
        raise SystemExit(f"the skeleton holds handle {max(handles):X}, at or above the first entity handle {FIRST:X}")
    owner = doc.modelspace().block_record_handle
    return {
        "about": "AC1024 skeleton of the nest DXF writer, written by tools/py/make_dxf_template.py (M07-T06 step 1); regenerate in a deliberate PR, never in a build",
        "ezdxf": ezdxf.__version__,
        "sourceDateEpoch": SOURCE_DATE_EPOCH,
        "layers": [n for n, _ in LAYERS],
        "owner": owner,
        "first": FIRST,
        "tpl": tpl,
    }


def main():
    # ezdxf collects the CLASSES section through a set, so the class order
    # follows the string hash seed; one seed gives one template.
    if os.environ.get("PYTHONHASHSEED") != "0":
        os.execve(sys.executable, [sys.executable, *sys.argv], {**os.environ, "PYTHONHASHSEED": "0"})
    got = json.dumps(build(), indent=1, ensure_ascii=True) + "\n"
    if "--write" in sys.argv:
        os.makedirs(os.path.dirname(OUT), exist_ok=True)
        open(OUT, "w", newline="\n").write(got)
        print(f"wrote {os.path.relpath(OUT, ROOT)}")
        return
    have = open(OUT).read() if os.path.exists(OUT) else None
    if have != got:
        sys.stderr.write(f"FAIL {os.path.relpath(OUT, ROOT)} differs from the ezdxf {EZDXF} skeleton; rerun with --write in a deliberate PR\n")
        raise SystemExit(1)
    print(f"{os.path.relpath(OUT, ROOT)} equals the ezdxf {EZDXF} skeleton")


if __name__ == "__main__":
    main()
