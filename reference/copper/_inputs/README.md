# KEYWAY family inputs

The files the seven KEYWAY family generators read and their bench folders
did not ship (synthesis plan-deltas.md line 973). They exist in the corpus
and are vendored here unchanged, so nothing is fabricated (D-149).
`tools/py/copper/run_legacy_gen.py` places the three woff2 beside a
generator in a temp dir and points the generator's logo literal at the
logo here.

| file | copied from | sha256 | licence |
|---|---|---|---|
| `hackbuild-logo.svg` | member `board-forge/assets/hackbuild-logo.svg` (dated 2026-08-10) of `fab-work-directory:benches/cricut-midi-seven/outputs/board-forge-updated.zip` | c0b0c1f6d2f065f4630788e34488c5949eb205fc31505db46681bf851c9c8c02 | the owner's mark, outside every open grant (D-171, `TRADEMARKS.md`) |
| `ibm-plex-mono-latin-400-normal.woff2` | `files/ibm-plex-mono-latin-400-normal.woff2` of the npm tarball @fontsource/ibm-plex-mono 5.3.0 | 08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7 | OFL-1.1 |
| `ibm-plex-mono-latin-600-normal.woff2` | `files/ibm-plex-mono-latin-600-normal.woff2` of the same tarball | 0d1f0b8d0722224e32e9f28261bdc86c79115be73444ae5eceb73976a1bcdf83 | OFL-1.1 |
| `ibm-plex-mono-latin-700-normal.woff2` | `files/ibm-plex-mono-latin-700-normal.woff2` of the same tarball | 4f84d86cfd060f4ded334358ff8a4c81d4db2ed5addd568359d693f44a87765a | OFL-1.1 |
| `OFL-1.1.txt` | `LICENSE` of the same tarball: the IBM copyright line and the SIL Open Font License 1.1 text | 23b0a9d0c6d3f140a0b77e483c5cfa6bba574325ef5cb189ed9f2fec4884533f | OFL-1.1 |

The tarball is `fontsource-ibm-plex-mono-5.3.0.tgz`, sha256
60d3c0cfa549cb06fcb8867ee83f994d78e212abfac3bef3275436acb5c4d029, fetched
with `npm pack @fontsource/ibm-plex-mono@5.3.0` on 2026-10-08. The same
three woff2 files sit in
`fab-knowledge:originals/keyway/files/inputs/`,
which the 2026-10-04 rerun used. The logo bytes equal the `brand.mark`
canonical row in the root `lineage.json`; the fonts are the
`font.plex-mono-*` rows. The licence path map (`tools/licences.json`,
`docs/plan/LICENSING.md` section 1.2) holds the logo row first and the
woff2 row second, and `LICENSES/OFL-1.1.txt` is the licence text alone.
