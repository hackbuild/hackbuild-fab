#!/bin/sh
# assemble pip.html: kernel sources become numbered parts ahead of part2/part3
set -e
cd "$(dirname "$0")"
B=bench
rm -f $B/part1[0-9]-*.js
cp vendor/manifold-classic.js $B/part10-manifold.js
cp src/snapfe.js $B/part11-snapfe.js
cp src/geom.js $B/part12-geom.js
cp src/font.js $B/part13-font.js
cp src/layout.js $B/part14-layout.js
cp src/router.js $B/part15-router.js
cp src/model.js $B/part16-model.js
cp src/pkg.js $B/part17-pkg.js
cp src/coupon.js $B/part18-coupon.js
mkdir -p out
python3 tools/build_bench.py $B out/pip.html --vendor node_modules --fonts
python3 tools/build_bench.py $B out/pip-cdn.html
cp out/pip.html pip.html
