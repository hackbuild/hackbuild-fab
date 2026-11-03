# geom text fonts

The faces the node text route sets inlay text in (OK-01). COLLAR loads its
fonts from Google Fonts at run time (`collar.html` line 9); node has no
canvas and no network, so the faces it can set are vendored here and read
once into one table per family, `src/text/*.table.ts`, by
`node packages/geom/scripts/fonts.mjs --write` (after `npx tsc -b`). Nothing
reads these files at run time; `test/text.test.ts` holds the table equal to
a fresh read of them.

| file | copied from | sha256 | licence |
|---|---|---|---|
| `ibm-plex-mono-latin-400-normal.woff2` | `files/ibm-plex-mono-latin-400-normal.woff2` of the npm package @fontsource/ibm-plex-mono 5.3.0, as installed in `node_modules` | 08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7 | OFL-1.1 |
| `ibm-plex-mono-latin-700-normal.woff2` | `files/ibm-plex-mono-latin-700-normal.woff2` of the same package | 4f84d86cfd060f4ded334358ff8a4c81d4db2ed5addd568359d693f44a87765a | OFL-1.1 |
| `permanent-marker-latin-400-normal.woff2` | `files/permanent-marker-latin-400-normal.woff2` of @fontsource/permanent-marker 5.3.0 | 4884fec2c73aa52a2461073c1b87d1ceb80f400520391b43f97ca7d3c39eeb24 | Apache-2.0 |
| `special-elite-latin-400-normal.woff2` | `files/special-elite-latin-400-normal.woff2` of @fontsource/special-elite 5.3.0 | 770493d84cbb753cd0573d0f014550583138f40469d137e310d239593a1949d8 | Apache-2.0 |
| `vt323-latin-400-normal.woff2` | `files/vt323-latin-400-normal.woff2` of @fontsource/vt323 5.3.0 | 8ddbebcc1048154132e1d78eb9b1f7850bca1b7d857035ccf1cb4318ebc615b6 | OFL-1.1 |
| `APACHE-2.0-permanent-marker.txt` | `LICENSE` of @fontsource/permanent-marker 5.3.0 | 044195cfd809d76ea2aaf1c8e3dd80b9fd9447227efc05e51fc906c4a451d451 | Apache-2.0 |
| `APACHE-2.0-special-elite.txt` | `LICENSE` of @fontsource/special-elite 5.3.0 | 537aa64935057b48bf55502bb5662230aa2914fc8fd1d5955a786a3bb2056894 | Apache-2.0 |
| `OFL-1.1-vt323.txt` | `LICENSE` of @fontsource/vt323 5.3.0 | 27d9af34210253e7ca1251fbace86c6f65b40031d6ce1a75493a1b2093631298 | OFL-1.1 |
| `OFL-1.1.txt` | `LICENSE` of the same package: the IBM copyright line and the SIL Open Font License 1.1 text | 23b0a9d0c6d3f140a0b77e483c5cfa6bba574325ef5cb189ed9f2fec4884533f | OFL-1.1 |

The woff2 files are byte equal to `reference/copper/_inputs` and to the
`font.plex-mono-*` canonical rows of the root `lineage.json`; the
`font.plex-mono-*/geom-text` rows name these copies. The licence path map
(`tools/licences.json`) puts the woff2 files and the generated table under
OFL-1.1, since the table is a format conversion of the Font Software.

IBM Plex Mono is vendored at 400 and 700 (a text layer is regular or
bold, `collar.html` line 1015); the other three faces at 400 only. All five
are TrueType flavoured (woff2 flavor 0x00010000, read from the file header),
so the tables carry quadratic contours only. Another family or weight, such
as 700 VT323, is refused with E_KERNEL naming the faces here; no face is
substituted and no bold is synthesised.
