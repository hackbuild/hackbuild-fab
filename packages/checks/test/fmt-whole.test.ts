// A printed number traces to a source field at its own precision (D-010,
// core/test/message-numbers.test.ts): a whole print must equal its value.
// midi-pad K2 reads C = 10.9996 pF computed; CHK-NET-29 printed "at 11 pF",
// a whole that no field holds.

import { describe, expect, test } from "vitest";
import type { CheckCtx, HookupDecl, Net, Part, TargetOf } from "@hackbuild/spec";
import { fmt } from "../src/skeleton/common.js";
import { runNet29 } from "../src/net/net29.js";

describe("fmt never prints a non-whole value as a whole", () => {
  test("10.9996 at 3 decimals prints 11.0, a whole value prints whole", () => {
    expect(fmt(10.999600000000001)).toBe("11.0");
    expect(fmt(11)).toBe("11");
    expect(fmt(8.700149070624304)).toBe("8.7");
    expect(fmt(9.2)).toBe("9.2");
    expect(fmt(20)).toBe("20");
    expect(fmt(-0.0001)).toBe("-0.0");
  });

  test("CHK-NET-29 at C 10.9996 pF computed prints 11.0 pF", () => {
    const net: Net = {
      id: "K2", conductors: [], bodies: [], terminals: ["port.K2"], resistance: [], bulkOhm: 981764, contacts: [],
      totalOhm: [981764, 981764], unpricedContacts: [], capToGndPf: 10.999600000000001, couplingPf: {}, capMethod: "pip-per-mm",
      tier: "inferred", qualifier: "computed",
    };
    const part = {
      id: "pad", bodies: [],
      features: [{ kind: "port", id: "port.K2", body: "pad", net: "K2", type: "signal", interface: "digital" }],
    } as unknown as Part;
    const hookup = [{
      port: "port.K2", mcu: "rp2040", pin: "GP4",
      read: { model: "charge-release", drive: "high", driveUs: 30, waitUs: 3500, waitSource: "default" },
    }] as unknown as HookupDecl[];
    const ctx = { hookup } as unknown as CheckCtx;
    const [f] = runNet29({ level: "net", part, net } as TargetOf<"net">, ctx);
    expect(f?.extra?.["cPf"]).toBe(10.999600000000001);
    expect(f?.constraint).toContain("over 5 tau at 11.0 pF");
  });
});
