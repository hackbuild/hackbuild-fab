"""M00-T10: the 3MF corpus runner and its manifest.

The slug rule of step 1, the manifest rules run.py enforces (sameAs, one
destination per source, gold copied once), the synthetic fixtures staying
in step with make_known_bad.py, and the acceptance case: a copy of the
validator that skips CHK-3MF-06 makes run.py exit 1.
"""
import copy
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
CORPUS = REPO / "tools/corpus/3mf"
sys.path.insert(0, str(CORPUS))
import run  # noqa: E402


def rows():
    return json.loads((CORPUS / "manifest.json").read_text(encoding="utf-8"))["rows"]


def test_slug_rule_on_the_owner_names():
    assert run.slug("all pivots.3mf") == "all-pivots.3mf"
    assert run.slug("ogee16-pivot-pin (1).3mf") == "ogee16-pivot-pin-1.3mf"
    assert run.slug("locket-r2 (1).3mf") == "locket-r2-1.3mf"
    assert run.slug("body.3mf") == "body.3mf"
    assert run.slug("cotter-kit_custom_2026-09-22 (1)") == "cotter-kit_custom_2026-09-22-1"


def test_manifest_holds_no_structural_problem():
    problems = []
    run.check_manifest(rows(), problems)
    assert problems == []


def test_same_as_row_with_a_different_source_fails():
    rs = copy.deepcopy(rows())
    coin = next(r for r in rs if r.get("sameAs") == "gold")
    coin["sha256"] = "0" * 64
    problems = []
    run.check_manifest(rs, problems)
    assert any("source sha256" in p and coin["id"] in p for p in problems)


def test_two_sources_on_one_destination_fail():
    rs = copy.deepcopy(rows())
    a, b = [r for r in rs if r["set"] == "boss"][:2]
    b["path"] = a["path"]
    problems = []
    run.check_manifest(rs, problems)
    assert any("both land at" in p for p in problems)


def test_owner_copies_and_gold_once():
    owner = [p for p in (CORPUS / "owner").rglob("*.3mf") if "roundtrip" not in p.parts and "downloads" not in p.parts]
    assert len(owner) == 24
    assert len(list((CORPUS / "owner/downloads").glob("*.3mf"))) == 11
    assert not [p for p in CORPUS.rglob("*") if " " in p.name or "(" in p.name]
    gold = next(r for r in rows() if r["id"] == "gold")
    copies = [p for p in CORPUS.rglob("*.3mf") if run.sha256(p) == gold["sha256"]]
    assert [p.relative_to(CORPUS).as_posix() for p in copies] == [gold["path"]]


def test_every_row_says_where_its_copy_sits():
    assert {r["where"] for r in rows()} <= set(run.WHERE)
    rs = copy.deepcopy(rows())
    del rs[0]["where"]
    problems = []
    run.check_manifest(rs, problems)
    assert any("where None is neither repo nor private" in p for p in problems)


def test_a_repo_row_without_its_copy_fails():
    rs = copy.deepcopy(rows())
    tenon = next(r for r in rs if r["id"] == "tenon-known-good")
    target = next(r for r in rs if r["id"] == tenon["sameAs"])
    target["path"] = tenon["path"] = "owner/downloads/absent.3mf"
    problems = []
    run.check_manifest(rs, problems)
    assert "manifest: %s has no copy at owner/downloads/absent.3mf" % target["id"] in problems


def test_a_private_row_without_its_copy_is_counted_not_run(tmp_path, monkeypatch, capsys):
    m = json.loads((CORPUS / "manifest.json").read_text(encoding="utf-8"))
    tenon = next(r for r in m["rows"] if r["id"] == "tenon-known-good")
    for r in m["rows"]:
        if r["id"] in (tenon["id"], tenon["sameAs"]):
            r["where"] = "private"
    manifest = tmp_path / "manifest.json"
    manifest.write_text(json.dumps(m), encoding="utf-8")
    empty = tmp_path / "corpus"
    empty.mkdir()
    monkeypatch.setattr(run, "MANIFEST", manifest)
    monkeypatch.setenv(run.CORPUS_VAR, str(empty))
    run.main(["--set", "tenon-known-good"])
    out = capsys.readouterr().out
    assert "1 private rows not run: no copy under %s" % empty in out
    assert "0 rows," in out
    assert " of 1 " not in out


def test_synthetic_fixtures_match_make_known_bad():
    p = subprocess.run([sys.executable, str(CORPUS / "make_known_bad.py"), "--check"], capture_output=True, text=True, cwd=REPO)
    assert p.returncode == 0, p.stdout + p.stderr


def _validator_copy(tmp_path):
    """validate_3mf.py copied with every CHK-3MF-06 result dropped, in a tree that resolves its repo paths."""
    py = tmp_path / "tools/py"
    py.mkdir(parents=True)
    os.symlink(REPO / "packages", tmp_path / "packages")
    os.symlink(REPO / "tools/py/orca3mf.py", py / "orca3mf.py")
    os.symlink(REPO / "tools/py/checks", py / "checks")
    src = (REPO / "tools/py/validate_3mf.py").read_text(encoding="utf-8")
    hook = "    def add(self, cid, verdict, constraint, legal, measured, path=None, extra=None):\n"
    assert hook in src
    edited = src.replace(hook, hook + "        if cid == \"CHK-3MF-06\":\n            return {}\n", 1)
    (py / "validate_3mf.py").write_text(edited, encoding="utf-8")
    return py / "validate_3mf.py"


def test_a_validator_skipping_chk_3mf_06_makes_the_runner_exit_1(tmp_path):
    copy_path = _validator_copy(tmp_path)
    p = subprocess.run([sys.executable, str(CORPUS / "run.py"), "--validator", str(copy_path), "--set", "known-bad"],
                       capture_output=True, text=True, cwd=REPO)
    assert p.returncode == 1, p.stdout + p.stderr
    assert "outside: known-bad/gold-missing-part: fails [], expected [CHK-3MF-06]" in p.stdout
    assert "outside: known-bad/cask-empty-plate: fails [CHK-3MF-07], expected [CHK-3MF-06, CHK-3MF-07]" in p.stdout


def test_the_reference_validator_passes_the_known_bad_set():
    p = subprocess.run([sys.executable, str(CORPUS / "run.py"), "--set", "known-bad"], capture_output=True, text=True, cwd=REPO)
    rows = json.loads((CORPUS / "manifest.json").read_text(encoding="utf-8"))["rows"]
    n = sum(r["set"] == "known-bad" for r in rows)
    assert n >= 6, "the known-bad set lost rows: %d" % n
    assert "known-bad %d of %d fail as named" % (n, n) in p.stdout, p.stdout + p.stderr
