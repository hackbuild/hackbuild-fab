#!/usr/bin/env python3
"""
sprue_parity.py: SPRUE's faces from sprue.html against @hackbuild/inlay in one Chromium (M03-T10).

    uv run --project tools/py --extra bench tools/py/harness/sprue_parity.py \\
        designs/sprue/legacy/sprue.html designs/sprue/test/parity.html [--out DIR]

1. Checks the legacy page and print-card.txt against designs/sprue/legacy/sha256.txt,
   cuts checkThin (sprue.html lines 1114 to 1125) and the two embedded
   @font-face rules (lines 10 and 11) from the page.
2. Bundles designs/sprue/test/parity.entry.ts with tsdown 0.23.0 as one IIFE.
3. Opens both pages from file:// in one browser context. Every http(s)
   request is aborted; font stylesheet requests (the legacy chrome fonts,
   which never reach the art) are listed apart, anything else is counted
   and fails the run.
4. Per scenario (phx, phx-small, coinyear; designs/sprue/test/legacy-read.js
   holds what each sets): the legacy page runs the preset and reads compose
   raw and clean and its own checkThin flags; the package page composes the
   same layers. Gate: 0 differing cells raw and clean on both faces and
   every thin flag equal. On a difference both grids go to the output folder.
5. Prints per-object volumes: the package build (hbf part.build, pick at the
   defaults, coin with the coin preset) beside print-card.txt and the legacy
   browser mesh, with the differences. Informational (D-075): no line fails.

tools/legacy/sprue-parity.mjs is the same harness on puppeteer-core, for
hosts where Playwright 1.63 refuses to run (macOS 12); both read the same
page code and print the same lines.

Driver: Playwright 1.63.0 (the bench extra). The browser is HBF_CHROMIUM when
set, else system Chrome on macOS, else Playwright's own Chromium.

exit 0 parity holds; 1 a difference, a counted request or a page error;
2 a missing input or a pin mismatch.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FLAGS = ["--allow-file-access-from-files", "--no-first-run", "--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"]
SCENARIOS = ["phx", "phx-small", "coinyear"]
EPOCH = "315532800"
FONT_RULE = re.compile(r'^@font-face\{font-family:"([^"]+)";font-style:normal;font-weight:(\d+);src:url\((data:font/woff2;base64,[A-Za-z0-9+/=]+)\) format\("woff2"\)\}$')
CARD_LINE = re.compile(r"^(coin|pick): [^\n]*\n\s+white (\d+) mm3, black (\d+) mm3, total (\d+) mm3 \(blank (\d+) mm3\)", re.M)


class Refused(Exception):
    pass


def sha256(b):
    return hashlib.sha256(b).hexdigest()


def legacy_inputs(legacy):
    d = os.path.dirname(legacy)
    pins = {}
    for line in open(os.path.join(d, "sha256.txt")).read().strip().split("\n"):
        h, name = line.split()
        pins[name] = h
    html = open(legacy, "rb").read()
    if sha256(html) != pins.get("sprue.html"):
        raise Refused("%s does not match %s" % (legacy, os.path.join(d, "sha256.txt")))
    card = open(os.path.join(d, "print-card.txt"), "rb").read()
    if sha256(card) != pins.get("print-card.txt"):
        raise Refused("print-card.txt does not match sha256.txt")
    lines = html.decode("utf8").split("\n")
    if not lines[1113].startswith("function checkThin(side) {") or lines[1124] != "}":
        raise Refused("checkThin is not at sprue.html lines 1114 to 1125")
    fonts = []
    for line in lines[9:11]:
        m = FONT_RULE.match(line)
        if m is None:
            raise Refused("sprue.html lines 10 and 11 are not the two embedded @font-face rules")
        fonts.append({"family": m.group(1), "weight": m.group(2), "url": m.group(3)})
    return {"thinSrc": "\n".join(lines[1113:1125]), "fonts": fonts, "card": card.decode("utf8")}


def card_volumes(card):
    out = {}
    for m in CARD_LINE.finditer(card):
        out[m.group(1)] = {"white": int(m.group(2)), "black": int(m.group(3)), "total": int(m.group(4)), "blank": int(m.group(5))}
    if "coin" not in out or "pick" not in out:
        raise Refused("print-card.txt holds no coin and pick volume lines")
    return out


def bundle(parity):
    entry = os.path.join(os.path.dirname(parity), "parity.entry.ts")
    out = os.path.join(os.path.dirname(parity), "dist")
    cmd = ["npx", "--no-install", "tsdown", entry, "--no-config", "--format", "iife", "--platform", "browser",
           "--target", "es2022", "--out-dir", out, "--logLevel", "error", "--no-fail-on-warn"]
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    js = os.path.join(out, "parity.entry.iife.js")
    if r.returncode != 0 or not os.path.exists(js):
        raise Refused("tsdown failed: %s" % (r.stderr or r.stdout).strip()[-2000:])
    return js


def package_volumes(params):
    cmd = ["npx", "--no-install", "hbf", "part.build", "designs/sprue", "--json", "--detail", "full"]
    if params is not None:
        cmd += ["--params", json.dumps(params)]
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, env={**os.environ, "SOURCE_DATE_EPOCH": EPOCH})
    j = json.loads(r.stdout)
    ir = (j.get("result") or {}).get("ir")
    if r.returncode != 0 or ir is None:
        raise Refused("hbf part.build designs/sprue failed: %s" % json.dumps(j.get("errors")))
    v = {b["id"]: b["mesh"]["volumeMm3"] for b in ir["bodies"]}
    return {"white": v.get("white", 0.0), "black": v.get("black", 0.0), "total": ir["solid"]["volumeMm3"], "build": j["result"]["build"]}


def diff_count(a, b):
    return sum(1 for x, y in zip(a, b) if x != y)


def run(a):
    legacy = os.path.abspath(a.legacy)
    parity = os.path.abspath(a.parity)
    inp = legacy_inputs(legacy)
    card = card_volumes(inp["card"])
    read = open(os.path.join(ROOT, "designs", "sprue", "test", "legacy-read.js")).read()
    bundle(parity)

    from playwright.sync_api import sync_playwright

    fonts_aborted, counted, errors, results = [], [], [], []

    def route(r):
        req = r.request
        is_font = req.resource_type in ("stylesheet", "font") and re.search(r"fonts\.(googleapis|gstatic)\.com", req.url)
        (fonts_aborted if is_font else counted).append(req.url)
        return r.abort()

    exe = os.environ.get("HBF_CHROMIUM") or (MAC_CHROME if os.path.exists(MAC_CHROME) else None)
    with sync_playwright() as p:
        browser = p.chromium.launch(args=FLAGS, **({"executable_path": exe} if exe else {}))
        ctx = browser.new_context()
        ctx.route(re.compile(r"^https?://"), route)
        for scenario in SCENARIOS:
            lg = ctx.new_page()
            lg.on("pageerror", lambda e: errors.append("sprue.html: %s" % e))
            lg.goto("file://" + legacy)
            lg.wait_for_function("globalThis.SPRUE_APP !== undefined && document.readyState === 'complete'", timeout=30000)
            # Boot rebuilds once on document.fonts.ready and once after 1500 ms (sprue.html:1675 to 1676).
            lg.wait_for_timeout(2000)
            L = lg.evaluate("(%s)(%s)" % (read, json.dumps({"scenario": scenario, "thinSrc": inp["thinSrc"]})))
            if "error" in L:
                raise Refused("legacy page, %s: %s" % (scenario, L["error"]))
            pk = ctx.new_page()
            pk.on("pageerror", lambda e: errors.append("parity.html: %s" % e))
            pk.goto("file://" + parity)
            pk.wait_for_function("typeof SPRUE_PARITY !== 'undefined'", timeout=30000)
            P = pk.evaluate("(x) => SPRUE_PARITY.run(x)", {"st": L["st"], "faces": L["faces"], "fonts": inp["fonts"]})
            results.append((scenario, L, P))
            lg.close()
            pk.close()
        version = browser.version
        browser.close()

    print("driver: playwright 1.63.0, chromium %s, flags %s" % (version, " ".join(FLAGS)))
    print("network: %d chrome font requests aborted, %d other requests counted" % (len(fonts_aborted), len(counted)))
    fails = []
    if counted:
        fails.append("requests outside file://: %s" % ", ".join(sorted(set(counted))))
    if errors:
        fails.append("page errors: %s" % "; ".join(errors))
    for scenario, L, P in results:
        lines = []
        for face in ("front", "back"):
            m = L["masks"][face]
            if m["w"] != P["w"] or m["h"] != P["h"]:
                fails.append("%s %s: grid %d x %d against %d x %d" % (scenario, face, m["w"], m["h"], P["w"], P["h"]))
                continue
            lr, lc = base64.b64decode(m["raw"]), base64.b64decode(m["clean"])
            pr, pc = base64.b64decode(P[face]["raw"]), base64.b64decode(P[face]["clean"])
            raw, clean = diff_count(lr, pr), diff_count(lc, pc)
            lines.append("%s raw %d clean %d differing cells of %d (%d ink cells after hygiene)" % (face, raw, clean, m["w"] * m["h"], sum(lc)))
            if raw or clean:
                os.makedirs(a.out, exist_ok=True)
                for k, v in (("legacy-raw", lr), ("legacy-clean", lc), ("package-raw", pr), ("package-clean", pc)):
                    open(os.path.join(a.out, "%s-%s-%s.bin" % (scenario, face, k)), "wb").write(v)
                fails.append("%s %s: %d raw and %d clean cells differ; both grids are in %s" % (scenario, face, raw, clean, a.out))
            lt = json.dumps(L["thin"][face], separators=(",", ":"))
            pt = json.dumps(P[face]["thin"], separators=(",", ":"))
            lines.append("%s thin legacy %s package %s" % (face, lt, pt))
            if lt != pt:
                fails.append("%s %s: thin flags %s against %s" % (scenario, face, lt, pt))
        print("%s (%s, ppm %s, grid %d x %d):" % (scenario, L["st"]["kind"], L["st"]["ppm"], P["w"], P["h"]))
        for line in lines:
            print("  " + line)

    print("per-object volume, mm3, informational (D-075): package hbf part.build | print-card.txt (sprue.py, shapely) | difference | legacy browser mesh of the scenario")
    legacy_mesh = {L["mesh"]["kind"]: dict(L["mesh"], scenario=s) for s, L, _ in results if s != "phx-small"}
    for obj, params in (("pick", None), ("coin", {"kind": "coin", "inlay": 3, "breakL": 2})):
        pk, c, lm = package_volumes(params), card[obj], legacy_mesh.get(obj)
        print("  %s (%s):" % (obj, pk["build"]))
        for k in ("white", "black", "total"):
            mine, theirs = pk[k], c[k]
            if lm is None:
                lv = "n/a"
            else:
                lv = "%.1f (%s)" % (lm["whiteVol"] + lm["blackVol"] if k == "total" else lm[k + "Vol"], lm["scenario"])
            print("    %-5s %8.1f | %5d | %7.1f | %s" % (k, mine, theirs, mine - theirs, lv))
    for f in fails:
        print("FAIL", f)
    return 1 if fails else 0


def main(argv):
    ap = argparse.ArgumentParser(description="SPRUE faces against @hackbuild/inlay")
    ap.add_argument("legacy")
    ap.add_argument("parity")
    ap.add_argument("--out", default=os.path.join(ROOT, ".hbf", "harness", "sprue"))
    a = ap.parse_args(argv)
    try:
        import playwright  # noqa: F401
    except ImportError:
        print("playwright is not installed; run with uv run --project tools/py --extra bench", file=sys.stderr)
        return 2
    try:
        return run(a)
    except Refused as e:
        print("refused: %s" % e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
