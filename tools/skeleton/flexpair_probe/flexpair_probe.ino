/*
 * flexpair_probe: reads the two keys of reference/keys/flex-pair preset "two"
 * on a Raspberry Pi Pico for M-S-T10 (exit B of the walking skeleton, D-179).
 *
 * Modelled on the FLOAT US column of pip-controller
 * firmware/pip_probe/pip_probe.ino (read only, D-080; knowledge/designs/pip.md
 * 5.10 and 5.12): charge the pin high, float it with no pull, and time how long
 * digitalRead takes to fall to LOW. The crossing is the pin's logic threshold
 * changing its mind, not an RC constant: read every number against another
 * number from this probe, never against a datasheet.
 *
 * Pins, from the chase hookup in reference/keys/flex-pair/chase.ts and the
 * generated print card in its README:
 *   K1, port.key1, GP2, key at x -14 mm, lead at the front edge x -12.9 mm
 *   K2, port.key2, GP3, key at x 14 mm, lead at the front edge x 15.1 mm
 *   GND, port.gnd, any Pico GND pin, lead at the right edge y 3 mm
 * (all positions computed by build.ts at preset two).
 *
 * Timing, each figure with its source and qualifier:
 *   CHARGE_US 30: the hookup driveUs, PIP's CHARGE_US (pip.md 5.11; source
 *     value).
 *   WAIT_US 3500: the hookup waitUs, waitSource default, as pip_stick.ino
 *     line 25 ships it (D-079; inferred). A crossing inside WAIT_US reads as
 *     pressed. This is the firmware discriminator and the probe uses it as is.
 *   The computed path for preset two is 364.8 kohm per key over inferred
 *     resistivity rows with four contacts unpriced, so a lower bound
 *     (computed; CHK-NET-29 of `hbf part.build reference/keys/flex-pair
 *     --preset two`). At 7 pF pin capacitance (inferred, pip-controller
 *     src/layout.js:46) that gives tau 2.55 us, a 5 tau settle of 12.8 us and
 *     a crossing to VIL 0.8 V from 3.3 V of 3.6 us (computed lower bounds,
 *     packages/circuit release.ts). The reject threshold WAIT_US / (5 x 7 pF)
 *     is 100 Mohm (computed). A computed tau is never a wait (pip.md 5.10):
 *     PIP's printed stick crossed at 113 to 2431 us pressed, 10 to 30 times
 *     its computed figure, and 6.5 to 17.8 ms idle, two pins never crossing
 *     inside 20 ms (measured, pip-controller docs/electrical.md). The log
 *     this probe prints is what puts a measured number beside the computed
 *     one.
 *   LIMIT_US 20000: the self test's open limit (pip.md 5.11; source value).
 *     It is long enough to time most of PIP's idle population, so a release
 *     line carries a crossing and not only "none". Two pins cost at most
 *     40 ms a scan, which leaves USB CDC fed.
 *   GUARD_US 2000: interrupts stay off only for the first 2 ms of a crossing,
 *     PIP's required patch 1 (pip.md 5.11; measured on hardware: 20 ms with
 *     interrupts off starved USB CDC). A crossing after 2000 us can carry a
 *     few microseconds of interrupt jitter (inferred), which does not move it
 *     across WAIT_US by any amount that matters.
 *   Debounce: a state changes after two agreeing scans, as PIP's firmware
 *     (pip.md 5.11; source value).
 *
 * What it prints, one line per event, for the owner to paste (the crossing
 * values in these examples are illustrative, not measured):
 *   event K1 GP2 press 7 pressed 412 us
 *   event K1 GP2 press 7 released 9120 us
 *   event K1 GP2 press 7 released none in 20000 us
 * and every 50 presses of a key one summary line per key:
 *   summary K1 GP2 presses 50 releases 50 pressed min 120 mean 410 max 900 us
 *     released min 6500 max 17800 us never 2 boot pressed 0
 * (one line in the log; wrapped here).
 *
 * What it cannot prove: a key that never reads pressed may be an open trace,
 * a lead that missed the trace, a cap that does not bridge the halves, or a
 * press that never closed the travel gap. This probe cannot tell those apart.
 * A key that reads pressed with nothing touching it is a short or a smear
 * between its net and GND, and the boot line says so.
 *
 * Serial at 115200: s summary now, c clear counts, b baseline again (hands
 * off), h help.
 */

#include <Arduino.h>

struct Key { const char *net; uint8_t pin; const char *port; };

/* The hookup rows of chase.ts, key net first. tools/test/flexpair-probe.test.mjs
   holds these equal to the generated print card. */
static const Key KEY[] = {
  { "K1", 2, "port.key1" },
  { "K2", 3, "port.key2" },
};
static const int N = (int)(sizeof KEY / sizeof KEY[0]);

static const unsigned CHARGE_US = 30;
static const uint32_t WAIT_US = 3500;
static const uint32_t LIMIT_US = 20000;
static const uint32_t GUARD_US = 2000;
static const int AGREE = 2;
static const uint32_t SUMMARY_EVERY = 50;
static const uint32_t SCAN_GAP_MS = 2;

struct Stat {
  bool pressed;
  int streak;               /* scans in a row that disagree with the state */
  uint32_t presses, releases;
  uint32_t pMin, pMax;
  uint64_t pSum;
  uint32_t rMin, rMax, rNever;
  uint32_t bootPressed;     /* baseline reads under WAIT_US with hands off */
};
static Stat st[N];

/* The crossing in microseconds, or LIMIT_US when the pin never fell. */
static uint32_t floatUs(uint8_t pin) {
  pinMode(pin, OUTPUT);
  digitalWrite(pin, HIGH);
  delayMicroseconds(CHARGE_US);
  noInterrupts();
  const uint32_t t0 = micros();
  pinMode(pin, INPUT);                   /* INPUT is no pull at all on this core */
  uint32_t dt = LIMIT_US;
  bool guarded = true;
  while (micros() - t0 < LIMIT_US) {
    if (digitalRead(pin) == LOW) { dt = micros() - t0; break; }
    if (guarded && micros() - t0 > GUARD_US) { interrupts(); guarded = false; }
  }
  if (guarded) interrupts();
  return dt;
}

static bool readsPressed(uint32_t us) { return us < WAIT_US; }

static void clearCounts() {
  for (int i = 0; i < N; i++) {
    st[i].presses = 0; st[i].releases = 0;
    st[i].pMin = LIMIT_US; st[i].pMax = 0; st[i].pSum = 0;
    st[i].rMin = LIMIT_US; st[i].rMax = 0; st[i].rNever = 0;
  }
  Serial.println("counts cleared");
}

static void summaryLine(int i) {
  const Stat &s = st[i];
  const unsigned long mean = s.presses ? (unsigned long)(s.pSum / s.presses) : 0UL;
  Serial.printf("summary %s GP%u presses %lu releases %lu", KEY[i].net, KEY[i].pin,
                (unsigned long)s.presses, (unsigned long)s.releases);
  if (s.presses) {
    Serial.printf(" pressed min %lu mean %lu max %lu us", (unsigned long)s.pMin, mean, (unsigned long)s.pMax);
  } else {
    Serial.print(" pressed none");
  }
  const uint32_t timed = s.releases - s.rNever;
  if (timed) {
    Serial.printf(" released min %lu max %lu us", (unsigned long)s.rMin, (unsigned long)s.rMax);
  } else {
    Serial.print(" released none timed");
  }
  Serial.printf(" never %lu boot pressed %lu\n", (unsigned long)s.rNever, (unsigned long)s.bootPressed);
}

static void summary() {
  for (int i = 0; i < N; i++) summaryLine(i);
}

static void baseline() {
  Serial.println("baseline: hands off both keys");
  delay(500);
  for (int i = 0; i < N; i++) {
    uint32_t lo = LIMIT_US, hi = 0, under = 0;
    for (int k = 0; k < 8; k++) {
      const uint32_t f = floatUs(KEY[i].pin);
      if (f < lo) lo = f;
      if (f > hi) hi = f;
      if (readsPressed(f)) under++;
    }
    st[i].bootPressed = under;
    st[i].pressed = under >= 4;
    st[i].streak = 0;
    Serial.printf("baseline %s GP%u idle min %lu max %lu us, %lu of 8 under %lu us\n", KEY[i].net, KEY[i].pin,
                  (unsigned long)lo, (unsigned long)hi, (unsigned long)under, (unsigned long)WAIT_US);
    if (under) {
      Serial.printf("  %s reads pressed with nothing touching it: a short or smear between %s and GND, "
                    "or a lead touching GND.\n", KEY[i].net, KEY[i].net);
    }
  }
}

static void help() {
  Serial.println();
  Serial.println("flexpair_probe for reference/keys/flex-pair preset two, M-S-T10.");
  Serial.printf("K1 on GP%u, K2 on GP%u, GND on a Pico GND pin.\n", KEY[0].pin, KEY[1].pin);
  Serial.printf("charge %u us, wait %lu us (inferred default), window %lu us, %d agreeing scans.\n",
                CHARGE_US, (unsigned long)WAIT_US, (unsigned long)LIMIT_US, AGREE);
  Serial.printf("a crossing under %lu us reads pressed. none in %lu us means the pin never fell.\n",
                (unsigned long)WAIT_US, (unsigned long)LIMIT_US);
  Serial.printf("press each key %lu times; a summary prints at every %lu presses of a key.\n",
                (unsigned long)SUMMARY_EVERY, (unsigned long)SUMMARY_EVERY);
  Serial.println("s summary, c clear counts, b baseline again (hands off), h help.");
}

static void onEvent(int i, uint32_t us) {
  Stat &s = st[i];
  if (s.pressed) {
    s.presses++;
    s.pSum += us;
    if (us < s.pMin) s.pMin = us;
    if (us > s.pMax) s.pMax = us;
    Serial.printf("event %s GP%u press %lu pressed %lu us\n", KEY[i].net, KEY[i].pin,
                  (unsigned long)s.presses, (unsigned long)us);
    if (s.presses % SUMMARY_EVERY == 0) summary();
  } else {
    s.releases++;
    if (us >= LIMIT_US) {
      s.rNever++;
      Serial.printf("event %s GP%u press %lu released none in %lu us\n", KEY[i].net, KEY[i].pin,
                    (unsigned long)s.presses, (unsigned long)LIMIT_US);
    } else {
      if (us < s.rMin) s.rMin = us;
      if (us > s.rMax) s.rMax = us;
      Serial.printf("event %s GP%u press %lu released %lu us\n", KEY[i].net, KEY[i].pin,
                    (unsigned long)s.presses, (unsigned long)us);
    }
  }
}

void setup() {
  Serial.begin(115200);
  const uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) delay(10);
  Serial.println();
  Serial.println("=== flexpair_probe ===");
  help();
  for (int i = 0; i < N; i++) st[i].bootPressed = 0;
  clearCounts();
  baseline();
}

void loop() {
  while (Serial.available()) {
    switch (Serial.read()) {
      case 's': summary();     break;
      case 'c': clearCounts(); break;
      case 'b': baseline();    break;
      case 'h': help();        break;
      default:                 break;   /* newlines from a terminal land here */
    }
  }
  for (int i = 0; i < N; i++) {
    const uint32_t us = floatUs(KEY[i].pin);
    Stat &s = st[i];
    if (readsPressed(us) != s.pressed) {
      if (++s.streak >= AGREE) {
        s.pressed = !s.pressed;
        s.streak = 0;
        onEvent(i, us);
      }
    } else {
      s.streak = 0;
    }
  }
  delay(SCAN_GAP_MS);
}
