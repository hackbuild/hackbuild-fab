#!/usr/bin/env bash
# Builds sparrow twice through tools/sparrow/build.sh, in two folders of
# different depth, and records in packages/nest/records/sparrow-eval.json
# (key "reproducible") whether the native binary, the wasm and the glue
# came out byte equal. Exit 0 when all three are equal, 1 otherwise.
#
#   bash tools/sparrow/repro.sh [folder-a] [folder-b]
#
# Defaults are two folders under the fab-knowledge evidence tree. When
# SPARROW_SRC names an existing sparrow checkout, each folder clones it
# locally instead of over the network; build.sh still checks the commit.
# The second build also rewrites the record's "build" key, so the record
# then describes folder b.

set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
EVID="$(cd "$ROOT/.." && pwd)/fab-knowledge/evidence"
A="${1:-$EVID/sparrow-repro/a}"
B="${2:-$EVID/sparrow-repro/deeper/folder/b}"

for w in "$A" "$B"; do
  rm -rf "$w"
  mkdir -p "$w"
  if [ -n "${SPARROW_SRC:-}" ]; then
    git clone --quiet "$SPARROW_SRC" "$w/src" || { echo "repro.sh: clone of $SPARROW_SRC failed" >&2; exit 1; }
  fi
  SPARROW_WORK="$w" bash "$HERE/build.sh" || { echo "repro.sh: build in $w failed" >&2; exit 1; }
done
node "$HERE/run.mjs" repro-record "$A" "$B"
