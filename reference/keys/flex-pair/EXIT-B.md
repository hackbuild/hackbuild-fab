# Exit B checklist: print and read keys flex-pair

The owner's steps for M-S-T10 (`docs/plan/milestones/M-S-walking-skeleton.md`,
D-179): export preset "two", print it on ffc5p, wire both keys to a
Raspberry Pi Pico, read 50 presses per key with `flexpair_probe`, and write
the result into the README verified block. Every figure below comes from the
generated print card in `README.md` or from `chase.ts`; where the two ever
disagree, the print card wins and `tools/test/flexpair-probe.test.mjs` fails
until this file is fixed.

Run every command from the repo root,
`hackbuild-fab`.

## 1. Export the 3MF

- [ ] Once per clone, build the CLI: `npx tsc -b`.
- [ ] At a terminal (the export gate needs an interactive terminal and has
      no bypass flag), run:

      ```sh
      SOURCE_DATE_EPOCH=315532800 npx --no-install hbf export.run reference/keys/flex-pair --kind 3mf --preset two --machine ffc5p --out reference/keys/flex-pair/out/flex-pair-two.3mf
      ```

- [ ] The gate prints one line naming the kind, machine, build hash, fail
      and warn counts and the path it writes, ending `[y/N]`. Read it and
      answer `y`. Expect 0 fail and 2 warn: the CHK-NET-29 result for
      each key, whose four contacts are unpriced (computed).
- [ ] Check the bytes and hash:

      ```sh
      wc -c reference/keys/flex-pair/out/flex-pair-two.3mf
      shasum -a 256 reference/keys/flex-pair/out/flex-pair-two.3mf
      ```

      Expected, from the print card `file:` line: 65703 bytes, sha256
      f082ad09b854f271f13cb961cd41a9243bc9a4e8f5d616c2b41170d7a4ded36c
      (regenerated 2026-10-21 when the key/flex-gap constraint def
      registered contact.gap and moved the registryHash and so the build
      hash the 3MF metadata carries; every mesh hash and volume is
      unchanged, computed; the slicer and validate_3mf.py were not run on
      it. It was 65701 bytes, sha256 e91d8a38...0f86, earlier on
      2026-10-21 after the CHK-KEY-05 2.0.0 bump, and 65702 bytes, sha256
      f20da97e...4784, from 2026-10-14, when chase.ts dropped its coupon
      export and moved defHash. It was 65703
      bytes, sha256 4419e5df...0eeb, from the M06 and M08 integration on
      2026-10-11, and 65701 bytes, sha256 ea0dd4f7...dc63, after M05-T20
      on 2026-10-09).
      A different hash means the build or the writer moved since the card
      was generated. Stop and record it; do not print a file the card does
      not describe.

## 2. Flash Studio checks

- [ ] Open `out/flex-pair-two.3mf` in Flash Studio.
- [ ] Four filaments sit on slots 1 to 4 (this also answers D-150):

      | slot | material | role | label | slicer filament |
      |---|---|---|---|---|
      | 1 | PETG | body | pad | Generic PETG @FF C5P |
      | 2 | cPLA | conductor | traces | Generic PLA @FF C5P |
      | 3 | TPU 95A | flex | cones | Generic TPU @FF C5P |
      | 4 | cTPU | flex-conductor | caps | Generic TPU @FF C5P |

- [ ] Printer profile Flashforge Creator 5 Pro 0.4 nozzle, process
      0.24mm Standard @FF C5, plate Textured PEI Plate.
- [ ] Slots 3 and 4: the writer borrows the PETG preset column for
      `Generic TPU @FF C5P` until a slicer save holds it (inferred). Look
      at the nozzle temperature and speed Flash Studio shows for both TPU
      slots and set them for your TPU and cTPU spools before slicing. Write
      down what it showed and what you set.
- [ ] Flash Studio 1.7.14 bundles no preset named `Generic TPU @FF C5P`
      (measured 2026-10-07; D-238). If slots 3 and 4 show a missing or
      `@System` preset, pick `Generic TPU-95A @FF C5P` for slot 3 and your
      cTPU preset for slot 4, and write down what you picked.
- [ ] Slice, open the preview and step to the layer at z 7.45 mm and the
      layers just above the caps. The inside of each key top over its grey
      cap must be TPU (slot 3), never PETG (slot 1). The virtual print found
      PETG there before D-236 and none after (computed); a GUI slice that
      still shows it is a finding for section 6.
- [ ] Select the flex-pair object and open its per-object settings: it
      should show `interlocking_beam` off, and each cap and trace part
      should show sparse infill density 100% (D-246). The headless CLI
      applies both from the file (computed, M05-T20 probes); whether the
      GUI shows and keeps them is unverified. Write down what it shows; if
      either is missing, set it by hand and record it under section 6.
- [ ] Load the matching spools: PETG on 1, conductive PLA on 2, TPU 95A on
      3, conductive TPU on 4.
- [ ] If Flash Studio refuses the file, merges slots or drops a filament,
      stop and record it under section 6.

## 3. Print notes from the print card

- Layer grid ffc5p_20260819: first layer 0.25 mm, then 0.24 mm (profile).
- No pause: the 3MF carries no custom_gcode_per_layer entry.
- The cPLA traces are buried in the band 0.73 to 1.45 mm above the bed
  (computed). Each lead is that trace where it meets the pad edge, 1.4 mm
  wide (the trace width default), so the edge face shows a short black
  stripe at that height.
- After peeling, work each key a few times to free the cone and its cap
  (PIP assembly step 1, bench/part2.js line 148).

## 4. Wiring

The pad is 60 by 30 mm (chase defaults). Lay it keys up, with the GND lead
on your right and the two key leads on the edge nearest you. K1 is then the
left key, K2 the right. Positions are computed by `build.ts` at preset two,
measured from the pad centre:

    far edge
    +----------------------------------------------------------+
    |                                                          |
    |          ( K1 )                       ( K2 )              |
    |         x -14 mm                      x 14 mm             +==== GND lead, right edge,
    |                                                          |     y 3 mm (18 mm from the
    |                                                          |     near edge)
    +-----------+----------------------------+-----------------+
                |                            |
            K1 lead                      K2 lead
            x -12.9 mm                   x 15.1 mm
            (17.1 mm from the left edge) (14.9 mm from the right edge)
    near edge

| net | pad lead | Pico pin | Pico physical pin |
|---|---|---|---|
| K1 | near edge, x -12.9 mm, 1.1 mm right of the K1 centre | GP2 | 4 |
| K2 | near edge, x 15.1 mm, 1.1 mm right of the K2 centre | GP3 | 5 |
| GND | right edge, y 3 mm | GND | 3 (any GND pin works) |

Physical pin numbers are from the Pico pinout (vendor). Pins 3, 4 and 5 sit
side by side on one header, near the USB end.

- [ ] Clip one lead to each black stripe. A small hook or alligator clip
      on the edge works; if PETG covers the stripe, scrape the edge with a
      knife until black cPLA shows.
- [ ] Check no clip touches a neighbour's stripe and no bare wire touches
      another.

## 5. Flash the probe and read 50 presses per key

The probe is `tools/skeleton/flexpair_probe/flexpair_probe.ino`. It charges
each pin high for 30 us, floats it with no pull and times the fall to LOW.
A crossing under 3500 us reads pressed (both the hookup defaults in
`chase.ts`; the wait is inferred, D-079). The window is 20000 us.

- [ ] Compile:

      ```sh
      arduino-cli compile --fqbn rp2040:rp2040:rpipico --warnings all --no-color tools/skeleton/flexpair_probe
      ```

- [ ] Find the port with `arduino-cli board list` (a `/dev/cu.usbmodem`
      name on macOS). On a Pico that has never run Arduino code, hold
      BOOTSEL while plugging it in; it mounts as `RPI-RP2` and the upload
      below still finds it.
- [ ] Upload. This writes the probe to the Pico's flash, replacing what is
      there:

      ```sh
      arduino-cli upload -p <port> --fqbn rp2040:rp2040:rpipico tools/skeleton/flexpair_probe
      ```

- [ ] Open the log and keep a copy:

      ```sh
      arduino-cli monitor -p <port> -c baudrate=115200 | tee flexpair-log.txt
      ```

      Hands off both keys while it boots. If the boot lines scroll past
      before the monitor opens, type `b` and press enter to take the
      baseline again.
- [ ] Press K1 fully and let go, 50 times, counting yourself. Leave K2
      alone. Then the same for K2, leaving K1 alone.
- [ ] Type `s` and enter at the end for a final summary.

What the log looks like (the crossing values here are illustrative, not
measured):

    baseline K1 GP2 idle min 8120 max 20000 us, 0 of 8 under 3500 us
    baseline K2 GP3 idle min 7310 max 20000 us, 0 of 8 under 3500 us
    event K1 GP2 press 1 pressed 412 us
    event K1 GP2 press 1 released 9120 us
    event K1 GP2 press 2 pressed 388 us
    event K1 GP2 press 2 released none in 20000 us
    ...
    event K1 GP2 press 50 pressed 401 us
    summary K1 GP2 presses 50 releases 49 pressed min 120 mean 410 max 900 us released min 6500 max 17800 us never 2 boot pressed 0
    summary K2 GP3 presses 0 releases 0 pressed none released none timed never 0 boot pressed 0
    event K1 GP2 press 50 released 8840 us

The summary prints the moment a key's 50th press registers, before that
press's release line, so it shows 49 releases; the `s` summary at the end
shows 50.

## 6. Pass, and what to record

A key passes when all of these hold:

- its boot line reads 0 of 8 under 3500 us;
- its summary appears on your 50th press, not before and not after (an
  early summary means a press counted twice, a late one means a press was
  missed);
- the final `s` summary shows presses 50 and releases 50;
- no event line names the other key while you press this one.

Exit B passes when both keys pass. Anything else is a failure to record,
never a retry until it passes. On a failure, record:

- which step: export hash, Flash Studio, slicing, print, wiring, read;
- what you saw, with the log lines or a photo;
- for a read failure, the press and release counts you made against the
  counts the summary shows, and whether it was no read, a short (a press
  with nothing touching the key, or a boot line over 0), a missed or
  doubled press, or a press on the wrong key.

A builder turns each failure into a check origin record and a line in
`tools/reports/skeleton-findings.md` (M-S-T10 step 5).

## 7. Paste back into the README

Replace the "None yet" paragraph under "Measured on a printed body" in
`reference/keys/flex-pair/README.md` with this block, filled in. Keep the
qualifier words; every crossing is measured, every position computed.

    - YYYY-MM-DD: preset "two" printed on ffc5p, file sha256 <first 12 hex
      of the sha256 you got> (equal to the print card: yes or no).
      Spools: slot 1 <PETG brand>, slot 2 <cPLA brand>, slot 3 <TPU 95A
      brand>, slot 4 <cTPU brand>. Flash Studio showed four filaments on
      slots 1 to 4: yes or no (D-150). TPU slot settings as shown: <temp,
      speed>; as printed: <temp, speed>.
    - K1 GP2: pressed <n> of 50, released <n> of 50; pressed crossing min
      <a> mean <b> max <c> us; released crossing min <d> max <e> us, never
      crossed in 20000 us <f> times; boot pressed <g> of 8 (measured,
      flexpair_probe, wait 3500 us inferred).
    - K2 GP3: the same fields.
    - Verdict: pass, or the failure and its finding id.

Then paste the two final summary lines verbatim under it in a fenced block.
