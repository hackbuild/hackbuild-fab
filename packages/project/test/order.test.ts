// Graph order is UTF-16 code-unit order, the order every other sort in core
// and spec uses, and never the host locale's collation. The ids below sort
// differently under en_US ("aa" before "Ia"), da_DK ("aa" after "z") and
// tr_TR (dotted and dotless I), so a locale-dependent sort fails here on
// every host. Code-unit order: "I" (0x49) < "a" (0x61) < "i" (0x69) < "z".

import { describe, expect, it } from "vitest";
import { assembleGraph, computeStale, downstream, type Item, type Link } from "../src/index";

const ids = ["x:aa", "x:z", "x:Ia", "x:ia"];
const codeOrder = ["x:Ia", "x:aa", "x:ia", "x:z"];
const zero = "0".repeat(64);
const items: Item[] = ids.map((id) => ({ id, kind: "legacy", uri: id, hash: zero }));

describe("graph order is code-unit order", () => {
  it("assembleGraph orders items by code unit", () => {
    expect(assembleGraph([], items).items.map((i) => i.id)).toEqual(codeOrder);
  });

  it("computeStale orders entries by code unit", () => {
    const links: Link[] = ids.map((from) => ({ from, to: "x:gone", kind: "reads", hashAtLink: zero }));
    expect(computeStale(items, links).map((s) => s.id)).toEqual(codeOrder);
  });

  it("downstream orders dependents by code unit", () => {
    const links: Link[] = ids.map((from) => ({ from, to: "x:root", kind: "reads", hashAtLink: zero }));
    expect(downstream(links, "x:root")).toEqual(codeOrder);
  });
});
