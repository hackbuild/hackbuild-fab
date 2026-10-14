/*
 * Host shim for flexpair_probe.ino: a virtual clock, a node model of each
 * key pin, and a serial port that timestamps every line it prints.
 *
 * Scenario file (written by sim/run.mjs from the computed electrical model;
 * every physical figure in it carries its qualifier in run.mjs, not here):
 *   seed <u64>                       noise generator seed
 *   vdd <V>                          drive level of an OUTPUT HIGH pin
 *   vil <V>                          a floated pin reads LOW below this
 *   noise <V>                        rms of the Gaussian noise added at each read
 *   pin <n> <C farad> <leak ampere>  node capacitance and leakage toward GND
 *   float <C farad> <leak ampere>    an optional floating node (a GND net cut off from GND)
 *   seg <n> <t0 us> <t1 us> <G to GND siemens> <G to float siemens>
 *                                    piecewise conductances, non-overlapping per pin
 *   input <t us> <char>              a byte the host sends at that time
 *   end <t us>                       stop the run
 *
 * Node model: C dV/dt = -(G V + leak) for a floated pin, solved exactly over
 * each step, plus charge exchange with the floating node through G to float
 * (explicit, the step is far below that branch's time constant). A pin set to
 * OUTPUT is held at its level. The node never goes below 0 V (the pin's clamp
 * diode, inferred).
 *
 * Output on stdout: "<virtual us>\t<line>" for every line the sketch prints.
 * On stderr at exit: the longest interrupts-off span, in virtual us.
 */
#include "Arduino.h"

#include <cmath>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

namespace {

/* Virtual cost of each core call, us (inferred: a few hundred ns per call at
   125 MHz on the arduino-pico core; nothing here is measured). */
constexpr double COST_READ = 0.25;
constexpr double COST_MICROS = 0.05;
constexpr double COST_MODE = 0.3;
constexpr double COST_WRITE = 0.1;
constexpr double COST_IRQ = 0.02;
constexpr double COST_PRINT = 20.0;
/* Largest step while a floating node is coupled, us. */
constexpr double STEP = 0.25;

struct Seg { double t0, t1, gGnd, gFloat; };

struct Pin {
  bool used = false;
  int mode = INPUT;
  int out = LOW;
  double v = 0;
  double c = 7e-12;
  double leak = 0;
  std::vector<Seg> segs;
  size_t at = 0;
};

struct Input { double t; char ch; };

double nowUs = 0;
double endUs = 1e12;
double vdd = 3.3, vil = 0.8, noiseV = 0;
uint64_t rng = 0x9E3779B97F4A7C15ULL;
Pin pins[30];
std::vector<Pin *> live; /* pins with a scenario row */
bool hasFloat = false;
double vFloat = 0, cFloat = 1e-12, leakFloat = 0;
std::vector<Input> inputs;
size_t nextInput = 0;
bool irqOff = false;
double irqOffAt = 0, irqOffMax = 0;
std::string line;
double lineAt = 0;

uint64_t splitmix() {
  uint64_t z = (rng += 0x9E3779B97F4A7C15ULL);
  z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9ULL;
  z = (z ^ (z >> 27)) * 0x94D049BB133111EBULL;
  return z ^ (z >> 31);
}

double uniform() { return (double)(splitmix() >> 11) * (1.0 / 9007199254740992.0); }

double gauss() {
  double u1 = uniform();
  if (u1 < 1e-300) u1 = 1e-300;
  return std::sqrt(-2.0 * std::log(u1)) * std::cos(2.0 * M_PI * uniform());
}

const Seg *segAt(Pin &p, double t) {
  while (p.at < p.segs.size() && p.segs[p.at].t1 <= t) p.at++;
  if (p.at < p.segs.size() && p.segs[p.at].t0 <= t) return &p.segs[p.at];
  return nullptr;
}

void flushLine() {
  std::printf("%.0f\t%s\n", lineAt, line.c_str());
  line.clear();
}

void finish() {
  if (!line.empty()) flushLine();
  std::fflush(stdout);
  std::fprintf(stderr, "sim interrupts-off max %.1f us\n", irqOffMax);
  std::exit(0);
}

/* Integrate every node over [t, t + dt), inside one segment of each pin. */
void step(double t, double dt) {
  double dq = 0; /* charge into the float node this step, coulomb */
  for (Pin *pp : live) {
    Pin &p = *pp;
    const Seg *s = segAt(p, t);
    const double g = s ? s->gGnd : 0;
    const double gf = s ? s->gFloat : 0;
    if (p.mode == OUTPUT) {
      p.v = p.out ? vdd : 0;
    } else {
      const double dtS = dt * 1e-6;
      if (g > 0) {
        const double vInf = -p.leak / g;
        p.v = vInf + (p.v - vInf) * std::exp(-dtS * g / p.c);
      } else {
        p.v -= p.leak * dtS / p.c;
      }
    }
    if (hasFloat && gf > 0) {
      const double q = gf * (p.v - vFloat) * dt * 1e-6;
      dq += q;
      if (p.mode != OUTPUT) p.v -= q / p.c;
    }
    if (p.v < 0) p.v = 0;
  }
  if (hasFloat) {
    vFloat += dq / cFloat - leakFloat * dt * 1e-6 / cFloat;
    if (vFloat < 0) vFloat = 0;
  }
}

/* The next time after t that any pin's conductances change, us. */
double nextBoundary(double t) {
  double b = 1e300;
  for (Pin *pp : live) {
    Pin &p = *pp;
    segAt(p, t);
    if (p.at < p.segs.size()) {
      const Seg &s = p.segs[p.at];
      const double e = s.t0 > t ? s.t0 : s.t1;
      if (e < b) b = e;
    }
  }
  return b;
}

double syncedAt = 0;  /* the nodes hold their state at this time */
double boundaryAt = -1; /* cached nextBoundary() */

/* Bring every node up to the clock. The nodes are read only at a pin call, so
   the clock runs ahead and they catch up here. The single-node solution is
   exact over any step inside one segment; only the float branch needs short
   steps. */
void sync() {
  while (nowUs - syncedAt > 1e-9) {
    double d = nowUs - syncedAt;
    if (hasFloat && d > STEP) d = STEP;
    if (syncedAt >= boundaryAt) boundaryAt = nextBoundary(syncedAt);
    const double b = boundaryAt - syncedAt;
    if (b > 1e-9 && d > b) d = b;
    step(syncedAt, d);
    syncedAt += d;
  }
}

void advance(double dt) {
  nowUs += dt;
  if (nowUs >= endUs) finish();
}

Pin &pinRef(uint8_t n) {
  if (n >= 30) {
    std::fprintf(stderr, "sim: pin %u out of range\n", n);
    std::exit(3);
  }
  return pins[n];
}

void loadScenario(const char *path) {
  FILE *f = std::fopen(path, "r");
  if (!f) {
    std::fprintf(stderr, "sim: cannot open scenario %s\n", path);
    std::exit(2);
  }
  char key[32];
  while (std::fscanf(f, "%31s", key) == 1) {
    if (key[0] == '#') {
      int ch;
      while ((ch = std::fgetc(f)) != EOF && ch != '\n') {}
    } else if (!std::strcmp(key, "seed")) {
      unsigned long long s;
      if (std::fscanf(f, "%llu", &s) == 1) rng = s;
    } else if (!std::strcmp(key, "vdd")) {
      std::fscanf(f, "%lf", &vdd);
    } else if (!std::strcmp(key, "vil")) {
      std::fscanf(f, "%lf", &vil);
    } else if (!std::strcmp(key, "noise")) {
      std::fscanf(f, "%lf", &noiseV);
    } else if (!std::strcmp(key, "pin")) {
      int n; double c, leak;
      std::fscanf(f, "%d %lf %lf", &n, &c, &leak);
      Pin &p = pinRef((uint8_t)n);
      if (!p.used) live.push_back(&p);
      p.used = true; p.c = c; p.leak = leak;
    } else if (!std::strcmp(key, "float")) {
      std::fscanf(f, "%lf %lf", &cFloat, &leakFloat);
      hasFloat = true;
    } else if (!std::strcmp(key, "seg")) {
      int n; Seg s;
      std::fscanf(f, "%d %lf %lf %lf %lf", &n, &s.t0, &s.t1, &s.gGnd, &s.gFloat);
      Pin &p = pinRef((uint8_t)n);
      if (!p.segs.empty() && s.t0 < p.segs.back().t1) {
        std::fprintf(stderr, "sim: overlapping or unsorted seg on pin %d at %.0f us\n", n, s.t0);
        std::exit(2);
      }
      p.segs.push_back(s);
    } else if (!std::strcmp(key, "input")) {
      Input in; char c[8];
      std::fscanf(f, "%lf %7s", &in.t, c);
      in.ch = c[0];
      inputs.push_back(in);
    } else if (!std::strcmp(key, "end")) {
      std::fscanf(f, "%lf", &endUs);
    } else {
      std::fprintf(stderr, "sim: unknown scenario key %s\n", key);
      std::exit(2);
    }
  }
  std::fclose(f);
}

}  // namespace

SerialShim Serial;

void pinMode(uint8_t pin, int mode) {
  if (mode != INPUT && mode != OUTPUT) {
    std::fprintf(stderr, "sim: pin mode %d is outside the model (no pull is modelled)\n", mode);
    std::exit(3);
  }
  Pin &p = pinRef(pin);
  if (!p.used) {
    std::fprintf(stderr, "sim: pin %u has no scenario row\n", pin);
    std::exit(3);
  }
  sync();
  p.mode = mode;
  advance(COST_MODE);
}

void digitalWrite(uint8_t pin, int value) {
  Pin &p = pinRef(pin);
  sync();
  p.out = value ? HIGH : LOW;
  if (p.mode == OUTPUT) p.v = p.out ? vdd : 0;
  advance(COST_WRITE);
}

int digitalRead(uint8_t pin) {
  Pin &p = pinRef(pin);
  advance(COST_READ);
  sync();
  if (p.mode == OUTPUT) return p.out;
  /* Noise only matters within a few sigma of the threshold; past 8 sigma
     the draw cannot change the reading, so it is skipped for speed. */
  if (std::fabs(p.v - vil) > 8 * noiseV) return p.v < vil ? LOW : HIGH;
  return p.v + noiseV * gauss() < vil ? LOW : HIGH;
}

uint32_t micros() {
  advance(COST_MICROS);
  return (uint32_t)(uint64_t)nowUs;
}

uint32_t millis() { return (uint32_t)(uint64_t)(nowUs / 1000.0); }

void delay(uint32_t ms) { advance(ms * 1000.0); }

void delayMicroseconds(unsigned us) { advance((double)us); }

void noInterrupts() {
  if (!irqOff) { irqOff = true; irqOffAt = nowUs; }
  advance(COST_IRQ);
}

void interrupts() {
  if (irqOff) {
    irqOff = false;
    const double span = nowUs - irqOffAt;
    if (span > irqOffMax) irqOffMax = span;
  }
  advance(COST_IRQ);
}

void SerialShim::begin(unsigned long) {}

int SerialShim::available() {
  return nextInput < inputs.size() && inputs[nextInput].t <= nowUs ? 1 : 0;
}

int SerialShim::read() {
  if (!available()) return -1;
  return (unsigned char)inputs[nextInput++].ch;
}

static size_t put(const char *s) {
  const size_t n = std::strlen(s);
  for (size_t i = 0; i < n; i++) {
    if (line.empty()) lineAt = nowUs;
    if (s[i] == '\n') {
      flushLine();
    } else {
      line.push_back(s[i]);
    }
  }
  advance(COST_PRINT);
  return n;
}

size_t SerialShim::print(const char *s) { return put(s); }
size_t SerialShim::println(const char *s) { const size_t n = put(s); put("\n"); return n + 1; }
size_t SerialShim::println() { return put("\n"); }

size_t SerialShim::printf(const char *fmt, ...) {
  char buf[512];
  va_list ap;
  va_start(ap, fmt);
  std::vsnprintf(buf, sizeof buf, fmt, ap);
  va_end(ap);
  return put(buf);
}

int main(int argc, char **argv) {
  if (argc != 2) {
    std::fprintf(stderr, "usage: probe-sim <scenario file>\n");
    return 2;
  }
  loadScenario(argv[1]);
  setup();
  for (;;) loop();
}
