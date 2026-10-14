include <params.scad>
use <printed.scad>
use <ogee16.scad>
rise = 0;                       // 0 .. STROKE
phi  = atan2(-(CRANK_R*sin(180+CRANK_SW)+rise)*0 + 0, 1);
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
// the drive lug, riding with its bar
color("#FE0386") translate([0,0,rise]) sYZ(DRIVE_X) p_rowdrive();
color("#FE0386") translate([0,0,rise]) sXY(RB_Z,TB)
  rect(BAR_X0, ROW_BAR_Y-RBW/2, BAR_X1, ROW_BAR_Y+RBW/2);
// the crank, turned to match
// the mesh's hub already sits at (RSV_CRK,0,0), which is ON the rotation axis,
// so rotate first and translate the axis into place after
color("#58a6ff") translate([0,ROW_BAR_Y,RSV_Z]) rotate([crank_phi_deg(rise),0,0])
  import("../out/print/crank_row_asm.stl");
function crank_phi_deg(r) =
  asin(sin(180+CRANK_SW) + r/CRANK_R) < 0 ? 180 - asin(sin(180+CRANK_SW) + r/CRANK_R)
                                          : 180 - asin(sin(180+CRANK_SW) + r/CRANK_R);
