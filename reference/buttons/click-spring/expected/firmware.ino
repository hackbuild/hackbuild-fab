// click-spring: charge-release read stub, emitted by hackbuild-fab from the archetype.
// Drive the pin high for DRIVE_US, float it, read after the wait: low means pressed.
#define DRIVE_US 30
#define KEY_WAIT_US 3500 // D-079 default as pip_stick ships it; replaced by the charge-release wait coupon (key path)
#define TOUCH_WAIT_US 1500 // pip.ino line 21; replaced by the charge-release wait coupon (touch path, skin)

const int PIN_KEY = 4; // key, waits KEY_WAIT_US

bool readPin(int pin, unsigned long waitUs) {
  pinMode(pin, OUTPUT); digitalWrite(pin, HIGH); delayMicroseconds(DRIVE_US);
  pinMode(pin, INPUT); delayMicroseconds(waitUs);
  return digitalRead(pin) == LOW;
}
