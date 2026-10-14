"""Cut a slicer G-code down to chosen layers for a committed test fixture.

    uv run --project tools/py tools/py/test/fixtures/gcode/cut_gcode.py \\
        <plate_1.gcode> <out.gcode> <first-layer:last-layer>[,...] <note>

Keeps the header block, each chosen layer from its ;LAYER_CHANGE to the next
one, the footer from ; EXECUTABLE_BLOCK_END, and the config lines the
analyzer reads. Every kept line is a line of the source. Before each run of
kept layers it writes a restore block, marked `; cut:`, that sets the tool,
role, width and head position the source had at that point, so the next
move starts where the slicer left it and prints with the same tool. The
tests never run this; it records how the fixtures were made.
"""
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "gcode"))
from analyze import CONFIG_KEYS  # noqa: E402


def state_before(lines, end):
    tool = role = width = None
    x = y = z = 0.0
    for s in lines[:end]:
        t = s.strip()
        if t.startswith(";TYPE:"):
            role = t[6:]
        elif t.startswith(";WIDTH:"):
            width = t[7:]
        code = t.split(";", 1)[0].split()
        if not code:
            continue
        if re.fullmatch(r"T\d+", code[0]):
            tool = code[0]
        elif code[0] in ("G0", "G1", "G2", "G3"):
            for w in code[1:]:
                if w[0] == "X":
                    x = float(w[1:])
                elif w[0] == "Y":
                    y = float(w[1:])
                elif w[0] == "Z":
                    z = float(w[1:])
    return tool, role, width, x, y, z


def cut(src: Path, ranges, note: str) -> str:
    lines = src.read_text(encoding="utf8").splitlines()
    starts = [i for i, s in enumerate(lines) if s.strip() == ";LAYER_CHANGE"]
    end_exec = next(i for i, s in enumerate(lines) if s.strip() == "; EXECUTABLE_BLOCK_END")
    h0 = next(i for i, s in enumerate(lines) if s.strip() == "; HEADER_BLOCK_START")
    h1 = next(i for i, s in enumerate(lines) if s.strip() == "; HEADER_BLOCK_END")
    keep = sorted({li for a, b in ranges for li in range(a, b + 1)})
    out = [f"; fixture: {note}", f"; layers kept: {', '.join(f'{a} to {b}' for a, b in ranges)}"]
    out += lines[h0:h1 + 1]
    out += ["G90", "M83"]
    prev = None
    for li in keep:
        a = starts[li]
        b = starts[li + 1] if li + 1 < len(starts) else end_exec
        if prev != li - 1:
            tool, role, width, x, y, z = state_before(lines, a)
            out.append(f"; cut: restore the state at source line {a + 1}, before layer {li}")
            if tool:
                out.append(tool)
            if role:
                out.append(f";TYPE:{role}")
            if width:
                out.append(f";WIDTH:{width}")
            out.append(f"G1 X{x:.3f} Y{y:.3f} Z{z:.3f}")
        out += lines[a:b]
        prev = li
    cfg = re.compile(r"^; (%s) = " % "|".join(re.escape(k) for k in CONFIG_KEYS))
    tail = lines[end_exec:]
    c0 = next(i for i, s in enumerate(tail) if s.strip() == "; CONFIG_BLOCK_START")
    out += tail[:c0 + 1] + [s for s in tail[c0 + 1:] if cfg.match(s)] + ["; CONFIG_BLOCK_END"]
    return "\n".join(out) + "\n"


def main(argv):
    src, dst, spec, note = Path(argv[0]), Path(argv[1]), argv[2], argv[3]
    ranges = [tuple(int(v) for v in r.split(":")) for r in spec.split(",")]
    dst.write_text(cut(src, ranges, note))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
