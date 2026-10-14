include <params.scad>
use <printed.scad>
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module rect(x0,y0,x1,y1) { translate([x0,y0]) square([x1-x0, y1-y0]); }
// cut the whole stack in half so the capture reads
intersection() {
  union() {
    color("#58a6ff") translate([0,0,RSV_Z]) a_shaft_row();
    color("#6b6459") sYZ(XI1+T/2) difference(){ rect(-16, 14, 16, 42);
      translate([0,RSV_Z]) circle(d=SHAFT_D+FIT_SLIDE, $fn=48); }
    color("#a6e22e") translate([XI1+T+0.2, 0, RSV_Z]) rotate([0,90,0]) a_knob();
  }
  translate([120,0,10]) cube([60, 30, 40]);
}
