/*
 * Host shim for tools/skeleton/flexpair_probe/flexpair_probe.ino: the part of
 * the arduino-pico core API the probe calls, on a virtual clock. The sketch
 * compiles unchanged against this header with clang++ on the host.
 *
 * Time is virtual. Every call costs a fixed number of virtual microseconds
 * (inferred, set in shim.cpp), so a float loop advances the clock the way a
 * polling loop does on the Pico. digitalRead on a floated pin returns the
 * state of a node model driven by a scenario file that sim/run.mjs writes
 * from the computed electrical model; see shim.cpp.
 */
#pragma once

#include <cstdint>
#include <cstddef>
#include <cstdio>
#include <cstdarg>

#define HIGH 1
#define LOW 0
#define INPUT 0
#define OUTPUT 1
#define INPUT_PULLUP 2

void pinMode(uint8_t pin, int mode);
void digitalWrite(uint8_t pin, int value);
int digitalRead(uint8_t pin);
uint32_t micros();
uint32_t millis();
void delay(uint32_t ms);
void delayMicroseconds(unsigned us);
void noInterrupts();
void interrupts();

class SerialShim {
 public:
  void begin(unsigned long baud);
  explicit operator bool() const { return true; }
  int available();
  int read();
  size_t print(const char *s);
  size_t println(const char *s);
  size_t println();
  size_t printf(const char *fmt, ...) __attribute__((format(printf, 2, 3)));
};

extern SerialShim Serial;

void setup();
void loop();
