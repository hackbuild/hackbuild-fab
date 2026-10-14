# SPROCKET: how it is made

Record written 2026-10-05 from the original code. Slug `sprocket`. Family robots. SPROCKET is a device bench: firmware plus a control page for a tracked chassis. It has no printed geometry and no 3D stage; the controls, the link and the safety rules are the design.

Number rules for this file. A number in a row that names a code location is a declared value copied from that line. "Computed" means arithmetic from a named formula. "Stated" quotes a code comment or page copy. Units are ms, Hz, bytes, volts.

Short paths: `FW` is `fab-knowledge:originals/sprocket/files/sprocket_fw/sprocket_fw.ino`; `H` is `fab-knowledge:originals/sprocket/files/sprocket.html`.

---

## 1. Identity and revision

| field | value |
|---|---|
| name | "SPROCKET, tracked robot firmware" (`FW` line 2), "SPROCKET / tank control" (`H` title), firmware string "SPROCKET 1.0" (`FW` 133) |
| owner's slug | sprocket |
| canonical firmware | `FW`, copied from `fab-work-directory:benches/sprocket/outputs/sprocket_fw/sprocket_fw.ino`; byte-identical to `~/Downloads/sprocket_fw (1).ino`; sha256 a6e63caf887af18ffe8639dad3776d62b5461dce4c925a99c2486d82f187317e (50207 bytes, 1379 lines) |
| canonical page | `H`, byte-identical to `~/Downloads/sprocket (3).html`; sha256 82275d5c610cc91e10710f80512bdffce595e265751ea9fa5369313c30500089 (55511 bytes, 1234 lines) |
| date | 2026-08-02 00:24 (both, Downloads mtime) |
| runtime | page: Google Fonts (Permanent Marker, Special Elite, VT323, IBM Plex Mono), Font Awesome 6.5.1 from cdnjs, Web Bluetooth, WebSocket; firmware: ESP32 Arduino core 2.x or 3.x, Adafruit NeoPixel |
| hook | none |
| chat | "ESP32 robot chassis bluetooth control", conversation 69efcc6c-3ec0-4740-8074-5fd08359df68 |

### 1.1 Every revision found

| file | date | what |
|---|---|---|
| `sprocket_fw.ino` | 2026-08-01 23:31 | first firmware (48525 bytes) |
| `sprocket.html`, `(1)`, `(2)` | 2026-08-01 23:47 to 23:51 | first pages |
| screenshot `Screen_Shot_2026-08-02_at_12_09_13_AM.png` | 2026-08-02 00:09 | telemetry lines split and interleaved over BLE in the console |
| `sprocket_fw (1).ino`, `sprocket (3).html` = harvest | 2026-08-02 00:24 | the fix: 180-byte notify chunks with a 12 ms drain, newline reassembly in the page, telemetry trimmed. Canonical |

### 1.2 Why this revision

It is the newest, and it is the one that fixes the only recorded field failure (split and interleaved telemetry over BLE). The earlier telemetry carried `wifi.ssid`, `clasp.base`, `clasp.url` and heap in bytes; the shipped `telemetryJson()` drops those and reports heap in kB (`FW` 970 to 1000). The page drive on 2026-10-05 found no page errors.

### 1.3 What is in `fab-knowledge:originals/sprocket/files/`

`sprocket.html`, `sprocket_fw/sprocket_fw.ino`. Hashes: `fab-knowledge:originals/sprocket/SHA256SUMS`.

---

## 2. What it makes and for whom

Control for a DFRobot Devastator style tracked chassis (two yellow TT gear motors) on a NULLLAB Maker-ESP32 (ESP32-WROOM-32E with four Toshiba TB67H450FNG drivers). One line-based text command protocol, reachable three ways: BLE Nordic UART (always on, no network needed), CLASP over WebSocket to `wss://relay.clasp.to` (drive from anywhere once WiFi is set), and USB serial. WiFi and CLASP credentials are set over BLE, so there is no captive portal and no hardcoded SSID. For a maker who wants to drive a tank from a phone or a laptop, safely, and wire extra servos and GPIO without reflashing.

---

## 3. Shots

Driven 2026-10-05 with `fab-knowledge:originals/_tools/shoot-tang-sensors.cjs` (puppeteer-core, headless Chrome, 1280 x 860), 6 s wait. With no board attached, shots k02 and k04 feed the page's own `onDeviceLine()` with JSON lines in the shape `telemetryJson()`, `configJson()` and the ID reply produce, so the panels show what a live board would. Files in `fab-knowledge:originals/sprocket/shots/`. No page errors.

| file | caption |
|---|---|
| `k01-boot-no-transport.png` | Boot: the hack.build bar (BLE, WIFI, CLASP, ARMED chips, ARM, red STOP), LINK, DRIVE, TELEMETRY "no data", console lines "SPROCKET control ready", "Motors are disarmed until you press ARM". |
| `k02-replayed-device-lines-drive.png` | After an ID, a CFG and a telemetry line: chips WIFI, CLASP and ARMED lit; DRIVE pad knob at THR 0.62, STEER 0.31, speed limit 70 percent (from `drive.max`); TELEMETRY bars M1 0.62, M2 0.31, device, firmware SPROCKET 1.0, ip, rssi -58 dBm, uptime 12m 34s, free heap 112 kB, dead-man ok, watched pin 34 = 2048. |
| `k03-tank-sticks.png` | TANK STICKS mode: the pad hides and two vertical sticks appear. |
| `k04-deadman-tripped.png` | A telemetry line with `dm 1` and the firmware's log line: dead-man TRIPPED in red, motor bars at zero. |
| `k05-lower-panels.png` | MOTOR TEST (M1 to M4 with GPIO pairs, hold-to-jog FWD and REV, FLIP per channel, role tags LEFT TRACK and RIGHT TRACK from `drive.l` and `drive.r`, steering gain, SAVE POLARITY), SERVOS (four channels on GPIO 25, 26, 32, 33 with CENTER, SWEEP, DETACH), GPIO (pin picker, mode, ADD PIN). |

---

## 4. Code map

| area | file and lines |
|---|---|
| header: board, protocol, pin map, build settings, power, safety, commands, config keys, CLASP addressing | `FW` 1 to 115 |
| pin tables, PWM constants | `FW` 128 to 158 |
| PWM wrappers for core 2.x and 3.x | `FW` 219 to 250 |
| config load and save (NVS namespace `sprocket`) | `FW` 254 to 305 |
| motors: attach, raw channel law, stop, tank, arcade | `FW` 307 to 378 |
| servos | `FW` 380 to 401 |
| GPIO table, claims, modes | `FW` 403 to 451 |
| BLE NUS: callbacks, line buffer, chunked notify, advertising | `FW` 453 to 540 |
| WebSocket client (RFC 6455) | `FW` 541 to 701 |
| CLASP binary codec and client | `FW` 702 to 937 |
| reply, log, telemetry JSON, config JSON | `FW` 939 to 1027 |
| WiFi start, stop, loop, scan | `FW` 1029 to 1071 |
| CLASP loop: dial only when stopped, backoff | `FW` 1072 to 1108 |
| command parser `handleLine` and `cfgSet` | `FW` 1109 to 1274 |
| status LEDs | `FW` 1275 to 1300 |
| setup, loop (serial, dead-man, telemetry, heartbeat) | `FW` 1306 to 1379 |
| page: tokens and shell | `H` 11 to 205 |
| page: panels LINK, DRIVE, TELEMETRY, MOTOR TEST, SERVOS, GPIO, ONBOARD CONFIG, CONSOLE | `H` 206 to 407 |
| page: CLASP client (Writer, Reader, value types, frame, Clasp class) | `H` 409 to 582 |
| page: BLE connect, single write queue | `H` 583 to 680 |
| page: CLASP connect, route, send, inbound lines | `H` 682 to 746 |
| page: drive pad, sticks, keys, gamepad, 80 ms tx loop | `H` 748 to 848 |
| page: e-stop, ARM with confirmation, speed limit debounce | `H` 849 to 879 |
| page: motor test, servos, GPIO, scan, config, ID | `H` 880 to 1121 |
| page: telemetry paint, chips, console | `H` 1123 to 1234 |

---

## 5. Mechanisms and constructions

### 5.1 Board map and PWM (`FW` 19 to 34, 138 to 158, 219 to 250)

M1 GPIO 27 and 13 (left track), M2 4 and 2 (right track), M3 17 and 12 and M4 14 and 15 only when the board's Motor/IO switch is on MOTOR; servo headers 25, 26, 32, 33; SPI 5, 18, 19, 23; I2C 21, 22; four RGB LEDs on 16; input-only 34, 35, 36, 39. Motors 20 kHz 10-bit on LEDC channels 0 to 7; servos 50 Hz 16-bit on 8 to 11, duty `us x 65535 / 20000`; auxiliary PWM 1 kHz 8-bit on 12 to 15. The wrappers compile on core 2.x (`ledcSetup`, `ledcAttachPin`) and 3.x (`ledcAttach`).

Build constraint (stated, `FW` 36 to 44): Partition Scheme "Huge APP (3MB No OTA/1MB SPIFFS)" is required; BLE plus WiFi plus TLS does not fit the default 1.2 MB app partition on a 4 MB board. Types live above the first function because the Arduino IDE injects prototypes before it.

### 5.2 Motor law and mixes (`FW` 330 to 378)

`motorRaw(ch, v)`: clamp to plus or minus 1; zero if disarmed; record the requested value for telemetry; apply the per-channel invert on every path; deadzone; `mag *= driveMax` (scale, do not clip); if `minDuty`, `mag = minDuty + mag (1 - minDuty)`; IN1 and IN2 PWM by sign, both low is coast. Arcade: `l = thr + steer sg`, `r = thr - steer sg`, both divided by `max(|l|, |r|)` when over 1; positive steer turns right. Tank: `driveTank(l, r)` on the configured left and right channels, and every drive command feeds the dead-man.

### 5.3 Safety rules (`FW` 51 to 56, 466 to 471, 1075 to 1088, 922 to 926, 1342 to 1353; `H` 849 to 879, 1231)

- Disarmed at boot; `EN 1` arms.
- Dead-man: when armed, moving (any `motorOut` over 0.001) and no drive command for `dead.ms` (default 1200), stop the motors and latch `deadmanTripped`, reported in telemetry (`FW` 1345 to 1353). It never trips while stopped, and it clears on the next DRV or TNK (`driveTank` resets the latch and the timer, lines 363 to 368); `CFG dead.ms 0` disables it.
- BLE disconnect calls `motorsStop()` and restarts advertising (`FW` 469 to 473). It does not clear `armed`, so after a reconnect the first drive command moves the tracks without a fresh EN 1; only the page's STOP, e-stop and unload paths send EN 0.
- CLASP dialing never happens while any motor output is non-zero, because the blocking connect stalls the loop ("Never do it mid-drive").
- CLASP SNAPSHOT (late-joiner state replay) is received and deliberately not executed: "a stale throttle value replayed on reconnect would drive the tank off a bench".
- The page streams a drive command every 80 ms while moving and otherwise a heartbeat every 400 ms, so the 1200 ms dead-man stays fed; hold-to-jog in MOTOR TEST resends every 150 ms.
- ARM does not flip the UI optimistically: it waits 1.2 s for telemetry to report `en` and logs an error naming a BLE write failure if the board never did.
- `beforeunload` sends STOP and EN 0. STOP sends STOP then EN 0. Gamepad button 1 is an e-stop.
- The LINK panel warns that the relay is public and the base address is the only access control.

M13 adopts three of these as link rules (never execute a replayed snapshot, arm confirmed by telemetry, stop on unload), and CHK-DEV-03 (heartbeat cadence under half the dead-man time) cites SPROCKET.

### 5.4 BLE Nordic UART (`FW` 453 to 540; `H` 583 to 680)

Service 6E400001, RX 6E400002 (write and write without response), TX 6E400003 notify; MTU 185. Notify in 180-byte chunks with a 12 ms delay between chunks when a line is split ("let the stack drain"). RX line buffer capped at 320 characters. Advertising: flags (3 bytes) plus one 128-bit UUID (18 bytes) is 21 of 31, so the name rides in the scan response "or the gap config call fails silently and nothing ever advertises".

Page side: every GATT write goes through one promise chain because "Chrome rejects a GATT write while another is in flight, and the command is simply dropped"; writes are 180-byte slices with `writeValueWithoutResponse` and a fallback; inbound bytes reassemble on newline with a 4000 character guard; the chooser filters by the NUS service or the `sprocket` name prefix (SHOW ALL BLE widens it); a NotFoundError names the macOS Privacy and Security Bluetooth permission.

### 5.5 Hand-written WebSocket and CLASP v3 binary codec (`FW` 541 to 937; `H` 409 to 582)

WebSocket client: `ws://` or `wss://` URL parse, random 16-byte key in base64 by mbedtls, 8 s handshake deadline, masked client frames, 126-length extension, refuses 127 (over 64 kB), ping answered with pong, close stops.

CLASP frame: `'S'` (0x53), flags (bits 7:6 QoS, 5 timestamp present so the header grows to 12, 4 encrypted, 3 compressed, 2:0 encoding with 1 = binary), u16 payload length big-endian, payload. Messages used: HELLO 0x01 (version 1, capability byte 0x80 | 0x40 | 0x20 for param, event and stream, name, empty token), WELCOME 0x02, SUBSCRIBE 0x10 (u32 id, pattern, 0xFF all signal types, 0x00 options), PUBLISH 0x20 (flags with the signal type in bits 7:5, EVENT = 1; address; has-value 1; type; value), SET 0x21 (value type in the low nibble, address, value, QoS 1), SNAPSHOT 0x23 (ignored), PING 0x41, PONG 0x42, ACK 0x50, ERROR 0x51. Values: NULL 0, BOOL 1, I32 4, I64 5, F32 6, F64 7, STRING 8 with a u16 length (the page also knows I8, I16, BYTES, ARRAY, MAP, ANNOUNCE, UNSUBSCRIBE, GET, BUNDLE, SYNC). Recorded as byte-identical to `@clasp-to/core@4.3.1` (`knowledge/projects/devices.md`, per the bench reader).

Addressing: subscribe `<base>/cmd` (a command line as an EVENT), publish `<base>/tel` (param, telemetry JSON), `<base>/log` (event), `<base>/online` (bool). Default base `/hackbuild/sprocket/demo`. Reconnect backoff 2 s doubling to 30 s.

### 5.6 Command protocol and config (`FW` 58 to 115, 1109 to 1274)

Commands (case-insensitive, one per line): ID, CFG, CFG key value, SAVE, BOOT, SCAN (up to 20 networks), WIFI 0/1, CLASP 0/1, TEL ms, EN 0/1, DRV thr steer, TNK l r, MOT ch v, STOP, SRV ch deg (`500 + deg x 2000/180` us), SRVU ch us (500 to 2500), SRVD ch, PIN gpio mode (in, inpu, inpd, out, pwm, adc; refuses pins claimed by motors, servos or the LEDs), OUT, PWM, RD, AN, WATCH, RGB, PING. Replies are one JSON object per line with `t` in id, cfg, tel, scan, log, ok, err, rd, an, pong, idle.

Config in NVS: name; wifi ssid, pass (echoed as `***`), on; clasp url, base, on; `tel.ms` 250; `tel.clasp` 1000; `dead.ms` 1200; `drive.l` 0; `drive.r` 1; `drive.i0` to `i3` (invert per channel, not per side); `drive.sg` 1.0 (0 to 2); `drive.max` 1.0; `drive.dz` 0.05; `drive.min` 0.0; `mot34`. `CFG key -` clears a string key.

### 5.7 Status LEDs and heartbeat (`FW` 1275 to 1300, 1370 to 1375)

LED 0 BLE (blue, blinking while advertising), 1 WiFi (green, amber blink while connecting), 2 CLASP (pink, blink while connecting), 3 armed amber; dead-man red blink; idle dim grey. Serial heartbeat every 5 s while no BLE client: `{"t":"idle","m":"advertising, no BLE client"}`.

### 5.8 Channel ownership and pin claims (`FW` 310 to 335, 403 to 451)

M1 and M2 are attached at boot. M3 and M4 attach only when `mot34` is set; until then `motorRaw` returns early for them, so a stray `MOT 2 0.5` cannot grab GPIO 17, 12, 14 or 15 while the board's switch has them on IO. `pinClaimed` refuses a `PIN` request for any attached motor pin, any attached servo pin, or the LED pin 16, so the GPIO panel cannot reconfigure a pin a driver owns. The GPIO table holds 12 entries; PWM mode takes one of four auxiliary LEDC channels (12 to 15) from `auxChanAlloc`, so a fifth PWM pin is refused. Reconfiguring a pin first detaches its auxiliary channel. A servo detach writes `pinMode(INPUT)` so the line floats rather than holding the last pulse.

### 5.9 Telemetry record and link bring-up (`FW` 970 to 1000, 1029 to 1057; `H` 640 to 650)

Each `tel` line carries: `up` (ms), `en`, `dm`, `m` (four requested motor values to 2 decimals, before invert, deadzone and scaling), `srv` (four pulse widths, 0 when detached), `ble`, `wifi` (`st`, `ip`, `rssi`), `clasp` (`st`), `heap` (kB) and `pins` (each watched pin with mode and value; analog pins read `analogRead`, outputs report the last written value). It goes to BLE every `tel.ms` (250) and to CLASP as a SET on `<base>/tel` every `tel.clasp` (1000). WiFi runs in station mode with modem sleep off and retries `WiFi.begin` every 20 s until connected. On BLE connect the page sends `ID`, then `CFG` 200 ms later, so the panels fill from the board's own state rather than from page defaults.

### 5.10 LED timing (`FW` 1279 to 1298, 1316)

The strip runs at brightness 60 of 255, refreshes every 200 ms and blinks on a 400 ms half period. Colour values (R, G, B of 255): BLE connected (0, 0, 40), advertising blink (0, 0, 6); WiFi connected (0, 40, 0), connecting blink (20, 12, 0); CLASP ready (40, 0, 22), connecting blink (14, 0, 8); armed (40, 12, 0), dead-man blink (50, 0, 0), disarmed (2, 2, 2).

---

## 6. Fits and settings

No printed parts. Power (stated, `FW` 46 to 49): motors need the 6 to 16 V barrel jack, USB alone will not turn the tracks, and the onboard power switch must be on.

---

## 7. UX anatomy (`sprocket.html`)

hack.build dark shell with paper panels: tokens `--paper #f5f0e6`, `--accent #FE0386`, `--dark #0a0a0a`; Permanent Marker panel heads, Special Elite body, VT323 readouts and chips, IBM Plex Mono buttons; Font Awesome icons; panels with an ink border and a pink block shadow.

- Top bar: BLE, WIFI, CLASP and ARMED chips; ARM or DISARM; a red STOP.
- LINK: CONNECT BLE, CONNECT CLASP, SHOW ALL BLE, router URL, base address, route (auto BLE first, BLE only, CLASP only, both), the public relay warning.
- DRIVE: a square pad with a knob (THR and STEER readout), speed limit slider writing `CFG drive.max` debounced 250 ms, TANK STICKS, ARCADE PAD, gamepad polling (0.12 deadzone, button 1 e-stop), keyboard WASD or arrows at 0.6 (shift for 1.0); Space is the e-stop, which sends STOP then EN 0 and disarms (`H` 795, 849 to 854). Full range goes on the wire; `drive.max` on the board is the single cap.
- TELEMETRY: four signed motor bars, device, firmware, ip, rssi, uptime, free heap, dead-man state, watched pins.
- MOTOR TEST: per channel GPIO pair, hold-to-jog FWD and REV at 0.6, FLIP writing `drive.iN`, role tags, steering gain, SAVE POLARITY.
- SERVOS: four sliders, CENTER, SWEEP (30 to 150 in 10 degree steps), DETACH.
- GPIO: add a pin with a mode (input-only guard on 34 to 39), toggle, high, low, PWM slider, read, watch.
- ONBOARD CONFIG: scan and pick an SSID, push credentials then SAVE then WIFI 1 after 400 ms, CLASP config, drive tuning.
- CONSOLE: 400 line cap, command history on the arrow keys.
- What makes it excellent: every safety rule is visible in the UI (arm needs confirmation, dead-man state is shown, the relay warning is next to the address), and one protocol serves BLE, CLASP and serial so the console works the same on every link.

---

## 8. Tests and harness

None in the outputs. The registry and `devices.md` mention a "drive audit" in the chat that is not in the files, and a byte comparison of the codec against `@clasp-to/core@4.3.1` (recorded in the knowledge file, not reproduced here). The drive on 2026-10-05 found no page errors.

---

## 9. Port map

| item | value |
|---|---|
| packages | `link` (transport over BLE NUS, CLASP and serial; dead-man; disarmed at boot; idle heartbeat; adopt-on-connect), `motion` (arcade and tank mix, per channel invert, deadzone, minimum duty), firmware emitters (PACKAGES line 1048 names SPROCKET) |
| feature kinds | none (no geometry) |
| canon id | MISSING: CANONS has no device-pattern list; the arcade mix with per-channel invert and the dead-man with heartbeat are candidates |
| reference id | MISSING |
| milestone | M13 (link rules: never execute a replayed snapshot, arm confirmed by telemetry, stop on unload; CHK-DEV-02 and CHK-DEV-03); M16 (registry row, `designs/sprocket/legacy/`) |
| lineage row | MISSING |
