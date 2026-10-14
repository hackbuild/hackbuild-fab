#!/usr/bin/env bash
# M07-T13: build sparrow from source at a pinned commit, natively and for
# wasm32-unknown-unknown, and record the build in
# packages/nest/records/sparrow-eval.json (measured). Evaluation only
# (D-137): nothing under packages/ depends on the outputs.
#
#   bash tools/sparrow/build.sh
#
# Exit 0 with the wasm size printed, or exit 1 naming the step that failed;
# the record is written either way. The work folder is $SPARROW_WORK,
# default the sparrow folder of the fab-knowledge evidence tree, outside the
# repo: src/ is the pinned checkout, wasm/ the wrapper crate copied from
# tools/sparrow/wasm, pkg/ the wasm package.
#
# Pins: sparrow commit SPARROW_COMMIT (Cargo.toml version 0.3.0, jagua-rs
# =1.0.0), the native Cargo.lock in tools/sparrow/native (sparrow's
# .gitignore drops Cargo.lock, so the pinned commit carries none; this is
# the lock cargo resolved for the first T13 build on 2026-10-08, sha256
# NATIVE_LOCK_SHA256, copied in after the checkout), the wrapper's
# Cargo.lock in tools/sparrow/wasm, rustc at least RUST_MIN (sparrow's
# rust-version), wasm-bindgen 0.2.129 through the wrapper lock (wasm-pack
# fetches the matching CLI). Flags: native `cargo build --release --locked
# --features only_final_svg` (the CLI writes only its final solution);
# wasm `wasm-pack build --target no-modules --release` with wasm-opt off and
# no target features, so the glue is a classic script and the module needs
# no shared memory and no Worker (D-129). Both builds remap source paths
# (RUSTFLAGS below), so the hashes hold in any folder.

set -uo pipefail

SPARROW_REPO="https://github.com/JeroenGar/sparrow"
SPARROW_COMMIT="3be915856b543d18c9cb7d4664fe7c53901fe1fd"
RUST_MIN="1.90.0"
NATIVE_LOCK_SHA256="f007ccbfcc7742f326421226201a3ee0f805b53d319d35491c3ff07962832e75"

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
WORK="${SPARROW_WORK:-$(cd "$ROOT/.." && pwd)/fab-knowledge/evidence/sparrow}"
mkdir -p "$WORK" && WORK="$(cd "$WORK" && pwd -P)"
export PATH="$HOME/.cargo/bin:$PATH"
export SPARROW_COMMIT SPARROW_WORK="$WORK"

# Panic locations carry source paths into both binaries: the work folder
# (sparrow and the wrapper) and the cargo home (jagua-rs and the other
# registry crates). Remapped to fixed names, the bytes no longer depend on
# where the build ran; std already says /rustc/<hash>. RUSTFLAGS replaces
# sparrow's .cargo/config.toml rustflags, which only name the wasm target,
# and the wasm build runs from WORK, where that file is not read anyway.
# tools/sparrow/repro.sh builds in two folders and compares the hashes.
# On darwin ld64 (820.1) also folds the object paths into LC_UUID, and the
# ad-hoc signature covers the UUID, so a second folder changed 47 bytes
# (measured); -oso_prefix strips the folder from those paths. Cargo keeps
# RUSTFLAGS out of the crate ids, so the absolute paths here move no hash.
CARGO_HOME_DIR="$(cd "${CARGO_HOME:-$HOME/.cargo}" && pwd -P)"
RUSTFLAGS="--remap-path-prefix=$WORK=/hbf-sparrow --remap-path-prefix=$CARGO_HOME_DIR=/cargo-home"
SPARROW_RUSTFLAGS="--remap-path-prefix=<work>=/hbf-sparrow --remap-path-prefix=<cargo home>=/cargo-home"
NATIVE_LINK=""
if [ "$(uname -s)" = "Darwin" ]; then
  NATIVE_LINK="-C link-arg=-Wl,-oso_prefix,$WORK/"
  SPARROW_NATIVE_RUSTFLAGS="$SPARROW_RUSTFLAGS -C link-arg=-Wl,-oso_prefix,<work>/"
fi
export RUSTFLAGS SPARROW_RUSTFLAGS SPARROW_NATIVE_RUSTFLAGS="${SPARROW_NATIVE_RUSTFLAGS:-$SPARROW_RUSTFLAGS}"
export SPARROW_DATE="$(date -u +%Y-%m-%d)"

record() {
  node "$HERE/run.mjs" build-record || echo "build.sh: the record could not be written" >&2
}

fail() {
  export SPARROW_STATUS="failed" SPARROW_FAILED_STEP="$1" SPARROW_FAILED_EXIT="$2"
  echo "build.sh: step '$1' failed with exit $2" >&2
  record
  exit 1
}

step() {
  local name="$1"
  shift
  echo "== $name"
  "$@"
  local code=$?
  [ "$code" -eq 0 ] || fail "$name" "$code"
}

rust_floor() {
  local have
  have="$(rustc -V | awk '{print $2}')"
  [ "$(printf '%s\n%s\n' "$RUST_MIN" "$have" | sort -V | head -1)" = "$RUST_MIN" ] || { echo "rustc $have is below $RUST_MIN" >&2; return 1; }
  rustup target list --installed | grep -qx wasm32-unknown-unknown || { echo "target wasm32-unknown-unknown is not installed; rustup target add wasm32-unknown-unknown" >&2; return 1; }
}

checkout() {
  if [ ! -d "$WORK/src/.git" ]; then
    git clone --quiet "$SPARROW_REPO" "$WORK/src" || return $?
  fi
  git -C "$WORK/src" cat-file -e "$SPARROW_COMMIT^{commit}" 2>/dev/null || git -C "$WORK/src" fetch --quiet origin || return $?
  git -C "$WORK/src" checkout --quiet --detach "$SPARROW_COMMIT" || return $?
  [ "$(git -C "$WORK/src" rev-parse HEAD)" = "$SPARROW_COMMIT" ] || { echo "checkout is not $SPARROW_COMMIT" >&2; return 1; }
  [ -z "$(git -C "$WORK/src" status --porcelain --untracked-files=no)" ] || { echo "the checkout has local edits" >&2; return 1; }
  [ "$(shasum -a 256 "$HERE/native/Cargo.lock" | awk '{print $1}')" = "$NATIVE_LOCK_SHA256" ] || { echo "tools/sparrow/native/Cargo.lock is not the pinned lock" >&2; return 1; }
  cp "$HERE/native/Cargo.lock" "$WORK/src/Cargo.lock" || return $?
}

native() {
  local t0 t1
  export SPARROW_NATIVE_CMD="cargo build --release --locked --features only_final_svg"
  # a clean build, so the recorded wall time is a whole build
  (cd "$WORK/src" && cargo clean --quiet) || return $?
  t0=$(date +%s)
  (cd "$WORK/src" && RUSTFLAGS="$RUSTFLAGS $NATIVE_LINK" $SPARROW_NATIVE_CMD) || return $?
  t1=$(date +%s)
  export SPARROW_NATIVE_S=$((t1 - t0)) SPARROW_NATIVE_DONE=1
}

wasm() {
  local t0 t1
  rm -rf "$WORK/wasm" "$WORK/pkg"
  mkdir -p "$WORK/wasm"
  cp -R "$HERE/wasm/Cargo.toml" "$HERE/wasm/Cargo.lock" "$HERE/wasm/src" "$WORK/wasm/" || return $?
  # inside the wrapper's root, so cargo hashes sparrow's crate id by a relative path
  ln -s ../src "$WORK/wasm/sparrow" || return $?
  # run from WORK so sparrow's own .cargo/config.toml (atomics for its threaded build) is not read
  export SPARROW_WASM_CMD="wasm-pack build wasm --target no-modules --release --out-dir pkg --no-typescript -- --locked"
  t0=$(date +%s)
  (cd "$WORK" && wasm-pack build wasm --target no-modules --release --out-dir "$WORK/pkg" --no-typescript -- --locked) || return $?
  t1=$(date +%s)
  [ -f "$WORK/pkg/hbf_sparrow_wasm_bg.wasm" ] || { echo "no wasm written" >&2; return 1; }
  export SPARROW_WASM_S=$((t1 - t0)) SPARROW_WASM_DONE=1
}

step "tools" bash -c 'for t in git cargo rustc rustup wasm-pack node; do command -v "$t" >/dev/null || { echo "$t not found" >&2; exit 127; }; done'
step "rust toolchain" rust_floor
echo "rustc: $(rustc -V); cargo: $(cargo -V); wasm-pack: $(wasm-pack --version)"
step "checkout $SPARROW_COMMIT" checkout
step "native build" native
step "wasm build" wasm
export SPARROW_STATUS="built"
step "record" record
echo "wasm size: $(wc -c <"$WORK/pkg/hbf_sparrow_wasm_bg.wasm" | tr -d ' ') bytes"
