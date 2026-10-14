# geom text fonts

The faces the node text route sets inlay text in (OK-01). COLLAR loads its
fonts from Google Fonts at run time (`collar.html` line 9); node has no
canvas and no network, so the faces it can set are vendored here and read
once into `src/text/plex-mono.table.ts` by
`node packages/geom/scripts/fonts.mjs --write` (after `npx tsc -b`). Nothing
reads these files at run time; `test/text.test.ts` holds the table equal to
a fresh read of them.

| file | copied from | sha256 | licence |
|---|---|---|---|
| `ibm-plex-mono-latin-400-normal.woff2` | `files/ibm-plex-mono-latin-400-normal.woff2` of the npm package @fontsource/ibm-plex-mono 5.3.0, as installed in `node_modules` | 08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7 | OFL-1.1 |
| `ibm-plex-mono-latin-700-normal.woff2` | `files/ibm-plex-mono-latin-700-normal.woff2` of the same package | 4f84d86cfd060f4ded334358ff8a4c81d4db2ed5addd568359d693f44a87765a | OFL-1.1 |
| `OFL-1.1.txt` | `LICENSE` of the same package: the IBM copyright line and the SIL Open Font License 1.1 text | 23b0a9d0c6d3f140a0b77e483c5cfa6bba574325ef5cb189ed9f2fec4884533f | OFL-1.1 |

The woff2 files are byte equal to `reference/copper/_inputs` and to the
`font.plex-mono-*` canonical rows of the root `lineage.json`; the
`font.plex-mono-*/geom-text` rows name these copies. The licence path map
(`tools/licences.json`) puts the woff2 files and the generated table under
OFL-1.1, since the table is a format conversion of the Font Software.

Only 400 and 700 are vendored: a text layer is regular or bold (COLLAR's
`bold` flag, `collar.html` line 1015). Another family or weight is refused
with E_KERNEL naming the faces here.
