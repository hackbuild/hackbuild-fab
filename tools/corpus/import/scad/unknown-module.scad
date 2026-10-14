// M04-T14 fixture: OpenSCAD exits 0 on the unknown module below and prints "Ignoring unknown module" (D-146).
cube([10, 10, 10]);
not_a_module(3);
