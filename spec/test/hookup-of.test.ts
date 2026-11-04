// hookupOf reads a build through chase.hookup then the entries its build
// emitted, and refuses a port listed twice.

import { describe, expect, test } from "vitest";
import { hookupOf, isThrownCommandError, type HookupDecl } from "../index.js";

const entry = (port: string, pin: string): HookupDecl => ({ port, mcu: "pico", pin, read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" } }) as HookupDecl;

describe("hookupOf", () => {
  test("chase entries first, then the build's; either may be absent", () => {
    const a = entry("k.0.port.key", "GPIO0"), b = entry("k.1.port.key", "GPIO1");
    expect(hookupOf({ hookup: [a] }, { hookup: [b] })).toEqual([a, b]);
    expect(hookupOf({}, { hookup: [b] })).toEqual([b]);
    expect(hookupOf({ hookup: [a] })).toEqual([a]);
    expect(hookupOf({})).toEqual([]);
  });

  test("a port in both lists is E_SCHEMA at the second entry", () => {
    let path = "";
    try { hookupOf({ hookup: [entry("k.0.port.key", "GPIO0")] }, { hookup: [entry("k.0.port.key", "GPIO1")] }); } catch (e) { if (isThrownCommandError(e)) path = String(e.hbf.path); }
    expect(path).toBe("/hookup/1/port");
  });
});
