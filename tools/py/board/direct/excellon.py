"""Excellon drill file, ported from SHUNT R1 gen_fab.py lines 231 to 249
(lineage shunt.fab/r1), which carries fix 16 over SPINDLE R1 pcb.py lines
434 to 451: G90, G05 and M71 belong inside the header, before the %
terminator; after it gerbonara warns that a header statement follows the
end of the header (M08 Records table).

Tools are sorted by diameter; hits keep the caller's order within a tool.
Coordinates are mm with three decimals (1 um), METRIC,TZ.
"""


def write_excellon(path, holes, plated, title):
    tools = {}
    for x, y, d in holes:
        tools.setdefault(round(d, 3), []).append((x, y))
    with open(path, "w", newline="\n") as f:
        f.write("M48\n; %s\n" % title)
        f.write("; %s\n" % ("plated" if plated else "non-plated"))
        f.write("METRIC,TZ\nFMAT,2\nG90\nG05\nM71\n")
        for i, d in enumerate(sorted(tools), start=1):
            f.write("T%dC%.3f\n" % (i, d))
        f.write("%\n")
        for i, d in enumerate(sorted(tools), start=1):
            f.write("T%d\n" % i)
            for x, y in tools[d]:
                f.write("X%.3fY%.3f\n" % (x, y))
        f.write("T0\nM30\n")
    return tools
