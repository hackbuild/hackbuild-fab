// ===========================================================================
// OGEE R14 - every part as a 2D cut profile and as a 3D solid.
//   p_<name>()  the finished cut profile, in the sheet's own plane. Laser.
//   v_<name>()  the SAME profile, extruded, in its assembly frame. Viewer.
// Any part with a rotational degree of freedom is exported with its mesh origin
// ON the axis of rotation, because the viewer rotates a mesh about its own
// origin and an offset baked into the mesh sends it swinging about the wrong
// point while still looking correct at zero tilt.
// ===========================================================================
include <params.scad>

module sheetXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
module sheetYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sheetXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }
module rect(x0,y0,x1,y1) { translate([x0,y0]) square([x1-x0, y1-y0]); }
// cell local (u,v) -> world (x,y) for pixel (i,j)
function cw(i,j,u,v) = [px(j) + u*cos(DIAG) - v*sin(DIAG),
                        py(i) + u*sin(DIAG) + v*cos(DIAG)];
module at_cell(i,j) { translate(cw(i,j,0,0)) rotate(DIAG) children(); }

// ---------------------------------------------------------------------------
// LUG. Semicircular top, one hole, two tenons, and now a dogleg: vertical from
// Plain vertical, and YAWED to face along the diagonal by its cell transform.
// ---------------------------------------------------------------------------
module lug_profile(base, floor) {
  difference() {
    union() {
      rect(-LUG_W/2, floor, LUG_W/2, ROD_Z);
      translate([0, ROD_Z]) circle(d=LUG_W);
      for(s=[-1,1]) rect(s*TEN_P-TEN_W/2, base, s*TEN_P+TEN_W/2, floor+EPS);
    }
    translate([0, ROD_Z]) circle(d=LUG_BORE);
  }
}
module p_rowlug() lug_profile(RB_Z, RB_Z+RB_H);
module p_collug() lug_profile(CB_Z, CB_Z+CB_H);
// CELL LOCAL frame: origin on the pixel, +u along the diagonal the link runs on.
// The whole cell is placed in the world by translate(pixel) * rotateZ(DIAG),
// which is what yaws the lugs across their bars.
module v_rowlug() translate([C,0,0]) sheetXZ(YOFF)  p_rowlug();
module v_collug() translate([-C,0,0]) sheetXZ(-YOFF) p_collug();

// ---------------------------------------------------------------------------
// LINK. Origin on the pivot midpoint, +x toward the row end. The crown is an
// arc struck from that same origin, so its top sits CROWN_R above the midpoint
// at any tilt and the averaging is exact.
// ---------------------------------------------------------------------------
module p_link() {
  difference() {
    union() {
      hull() { translate([-C,0]) circle(r=LINK_R);
               translate([C+ROW_SLOT_E,0]) circle(r=LINK_R); }
      intersection() { translate([CROWN_OFF,0]) circle(r=CROWN_R);
                       rect(CROWN_OFF-7, 0, CROWN_OFF+7, CROWN_R+1); }
    }
    translate([-C,0]) circle(d=LINK_BORE);
    hull() { translate([C,0]) circle(d=LINK_BORE);
             translate([C+ROW_SLOT_E,0]) circle(d=LINK_BORE); }
  }
}
module v_link() sheetXZ(0) p_link();

// ---------------------------------------------------------------------------
// ROD and CAP. The rod's top is a tenon that the cap mortises onto; the cap
// sits flush in a matching aperture in the upper face plate and stands 7.6mm
// proud when the pixel is set.
// ---------------------------------------------------------------------------
ZL = Z_LUG0 - CROWN_TOP;
function ceil_v(u) = -(u - (T/2 - PIN_PLAY)) * tan(RAMP_A);
module p_rod() {
  difference() {
    union() {
      rect(-PIN_W/2, PIN_BOTL, PIN_W/2, PIN_TOPL);
      polygon([[PIN_W/2-EPS, ZL],[PIN_W/2+LUG_P, ZL],
               [PIN_W/2+LUG_P, ZL+LUG_H],[PIN_W/2-EPS, ZL+LUG_H+LUG_RAMP]]);
    }
    polygon([[-NOTCH_W/2, PIN_BOTL-1],[NOTCH_W/2, PIN_BOTL-1],
             [NOTCH_W/2, ceil_v(NOTCH_W/2)],[-NOTCH_W/2, ceil_v(-NOTCH_W/2)]]);
  }
}
module v_rod() translate([0, PIN_PLAY, CROWN_TOP]) sheetYZ(0) p_rod();

module cap_outline(shape, d) {
  if      (shape=="circle")   circle(d=d);
  else if (shape=="square")   square([d,d], center=true);
  else if (shape=="hex")      circle(d=d, $fn=6);
  else if (shape=="triangle") rotate(-90) circle(d=d*1.15, $fn=3);
  else                        circle(d=d);
}
module p_cap(shape="circle") {
  difference() {
    rotate(-DIAG) cap_outline(shape, CAP_D);   // square to the world, not to the cell
    square([T+FIT_TEN, PIN_W+FIT_TEN], center=true);
  }
}
module v_cap(shape="circle") translate([0,0,FACE2_Z]) linear_extrude(T) p_cap(shape);

// ---------------------------------------------------------------------------
// BARS. Plain flat strips lying down, two laminated layers. The column bars are
// offset CX_OFF in -X so their raked lugs still put the pivot on px - C.
// ---------------------------------------------------------------------------
module mortise_pair(cx, cy, along_x) {
  for(s=[-1,1])
    if(along_x) translate([cx + s*TEN_P, cy])
                  square([TEN_W+FIT_TEN, T+FIT_TEN], center=true);
    else        translate([cx, cy + s*TEN_P])
                  square([T+FIT_TEN, TEN_W+FIT_TEN], center=true);
}
module p_rowbar() {
  cy = ROW_BAR_Y;
  difference() {
    rect(BAR_X0, cy-RBW/2, BAR_X1, cy+RBW/2);
    for(j=[0:N-1]) translate(cw(0,j,C,YOFF) - [0,py(0)]) rotate(DIAG)
      for(s=[-1,1]) translate([s*TEN_P,0])
        square([TEN_W+FIT_TEN, T+FIT_TEN], center=true);
    for(g=GUIDE_X) mortise_pair(g, cy, false);
    mortise_pair(DRIVE_X, cy, false);
  }
}
module p_colbar() {
  cx = COL_BAR_X;
  difference() {
    rect(cx-CBW/2, BAR_Y0, cx+CBW/2, BAR_Y1);
    for(i=[0:N-1]) translate(cw(i,0,-C,-YOFF)) rotate(DIAG)
      for(s=[-1,1]) translate([s*TEN_P,0])
        square([TEN_W+FIT_TEN, T+FIT_TEN], center=true);
    for(g=GUIDE_Y) mortise_pair(cx, g, true);
    mortise_pair(cx, DRIVE_Y, true);
  }
}
module v_rowbar() sheetXY(RB_Z, TB) p_rowbar();
module v_colbar() sheetXY(CB_Z, TB) p_colbar();

// ---------------------------------------------------------------------------
// END LUGS. Two per bar, both VERTICAL and both passing through tight deck
// slots. These are what actually keep a bar square now that the pivot lugs are
// raked. Both also run down to the base, and that landing is the rest stop.
// ---------------------------------------------------------------------------
ROW_YOKE_C = RSV_Z - CRANK_R*sin(CRANK_SW);
COL_YOKE_C = CSV_Z - CRANK_R*sin(CRANK_SW);
ENDLUG_TOP = DECK_Z + T + 1;   // proud of the deck but under the link
// Full width BELOW the bar (that foot is the rest stop) and ABOVE it, but only
// two tenons THROUGH it. A full width body through the mortise band would bury
// 66.6mm3 of lug in solid bar, which is what the audit caught.
module endlug(base, floor, top, w0, w1, cc, yoke_c, yoke0, yoke1) {
  difference() {
    union() {
      if(base > BASE_Z+T) rect(w0, BASE_Z+T, w1, base+EPS);
      rect(w0, floor, w1, top);
      for(s=[-1,1]) rect(cc+s*TEN_P-TEN_W/2, base, cc+s*TEN_P+TEN_W/2, floor+EPS);
    }
    if(yoke1 > yoke0)
      rect(yoke0, yoke_c-(T+FIT_SLIP)/2, yoke1, yoke_c+(T+FIT_SLIP)/2);
  }
}
module p_rowguide() endlug(RB_Z, RB_Z+RB_H, ENDLUG_TOP,
                           ROW_BAR_Y-6, ROW_BAR_Y+6, ROW_BAR_Y, 0,0,0);
module p_colguide() endlug(CB_Z, CB_Z+CB_H, ENDLUG_TOP,
                           COL_BAR_X-6, COL_BAR_X+6, COL_BAR_X, 0,0,0);
module p_rowdrive() endlug(RB_Z, RB_Z+RB_H, ENDLUG_TOP,
                           ROW_BAR_Y-10.5, ROW_BAR_Y+7, ROW_BAR_Y,
                           ROW_YOKE_C, ROW_BAR_Y-8.3, ROW_BAR_Y-1.7);
module p_coldrive() endlug(CB_Z, CB_Z+CB_H, CSV_Z+6,
                           COL_BAR_X-10.5, COL_BAR_X+7, COL_BAR_X,
                           COL_YOKE_C, COL_BAR_X-8.3, COL_BAR_X-1.7);
module v_rowguide() sheetYZ(GUIDE_X[0]) p_rowguide();
module v_rowdrive() sheetYZ(DRIVE_X) p_rowdrive();
module v_colguide() sheetXZ(GUIDE_Y[0]) p_colguide();
module v_coldrive() sheetXZ(DRIVE_Y) p_coldrive();

// ---------------------------------------------------------------------------
// GUIDE DECK. Discrete slots only, no channels.
// ---------------------------------------------------------------------------
module lug_slot(cx, cy, along_x) {
  // the lug is PRINTED, so this slot is sized on FIT_PSLIP
  if(along_x) translate([cx,cy]) square([LUG_W+FIT_PSLIP, T+FIT_PSLIP], center=true);
  else        translate([cx,cy]) square([T+FIT_PSLIP, LUG_W+FIT_PSLIP], center=true);
}
DECK_TAB_X = [4, 54, 104];
DECK_TAB_Y = [4, 54, 104];
module p_deck() {
  difference() {
    union() {
      rect(XI0, YI0, XI1, YI1);
      for(y=DECK_TAB_Y) { rect(XI0-T, y-TAB_W/2, XI0, y+TAB_W/2);
                          rect(XI1, y-TAB_W/2, XI1+T, y+TAB_W/2); }
      for(x=DECK_TAB_X) { rect(x-TAB_W/2, YI0-T, x+TAB_W/2, YI0);
                          rect(x-TAB_W/2, YI1, x+TAB_W/2, YI1+T); }
    }
    for(i=[0:N-1]) for(j=[0:N-1]) {
      translate(cw(i,j, C,  YOFF)) rotate(DIAG)
        square([LUG_W+FIT_PSLIP, T+FIT_PSLIP], center=true);
      translate(cw(i,j,-C, -YOFF)) rotate(DIAG)
        square([LUG_W+FIT_PSLIP, T+FIT_PSLIP], center=true);
    }
    // both the guide lug and the drive lug get 0.4mm slots: two tight stations
    // per bar is what squares it now that the pivot lugs are yawed
    for(i=[0:N-1]) {
      for(g=GUIDE_X) lug_slot(g, py(i)+ROW_BAR_Y, false);
      translate([DRIVE_X, py(i)+ROW_BAR_Y-1.75]) square([T+FIT_PSLIP, 17.5+FIT_PSLIP], center=true);
    }
    for(j=[0:N-1]) {
      for(g=GUIDE_Y) lug_slot(COL_BAR_X + px(j), g, true);
      translate([COL_BAR_X + px(j)-1.75, DRIVE_Y]) square([17.5+FIT_PSLIP, T+FIT_PSLIP], center=true);
    }
    rect(RSV_BRK-(T+FIT_LAP)/2, -16, RSV_BRK+(T+FIT_LAP)/2, 132);
    rect(-26, CSV_BRK-(T+FIT_LAP)/2, 124, CSV_BRK+(T+FIT_LAP)/2);
    for(j=[0:N-1]) rect(COL_BAR_X + px(j)-12.5, 118, COL_BAR_X + px(j)+12.5, 157);
    for(rx=LRIB_X) rect(rx-(T+FIT_LAP)/2, LRIB_Y0+1, rx+(T+FIT_LAP)/2, LRIB_Y1);
    rect(LSV_X-13, LRIB_Y0+1, LSV_X+13, LRIB_Y1-1);
  }
}
module v_deck() sheetXY(DECK_Z) p_deck();

// ---------------------------------------------------------------------------
// LATCH PLATE and the two FACE layers
// ---------------------------------------------------------------------------
// The plate releases along the cell's local +y, which in the world is the
// diagonal normal, so its drive slot is long along the diagonal and tight
// across it, and the crank swings about DIAG rather than about 0.
LDRIVE_U0 = LCRANK_R*cos(LCRANK_SW) - 6;
LDRIVE_U1 = LCRANK_R*cos(LCRANK_SW) + 6;
LDRIVE_V  = -LCRANK_R*sin(LCRANK_SW);
module p_latch() {
  difference() {
    hull() { rect(LP_X0, LP_Y0+8, LP_X1, LP_Y1-8);
             rect(LP_X0+8, LP_Y0, LP_X1-8, LP_Y1); }
    for(j=[0:N-1]) for(i=[0:N-1]) at_cell(i,j)
      rect(-SLOT_X/2, SLOT_B, SLOT_X/2, SLOT_E);
    translate([LSV_X, LSV_Y]) rotate(DIAG)
      rect(LDRIVE_U0, LDRIVE_V-(T+FIT_SLIP)/2, LDRIVE_U1, LDRIVE_V+(T+FIT_SLIP)/2);
  }
}
module v_latch() sheetXY(LP_Z) p_latch();

WTX = [-10, 20, 50, 80, 110, 140];
WTY = [-10, 20, 50, 80, 110, 140];
module face_tabs() {
  for(x=WTX) { rect(x-TAB_W/2, YI0-T-FIT_LAP/2, x+TAB_W/2, YI0+FIT_LAP/2);
               rect(x-TAB_W/2, YI1-FIT_LAP/2, x+TAB_W/2, YI1+T+FIT_LAP/2); }
  for(y=WTY) { rect(XI0-T-FIT_LAP/2, y-TAB_W/2, XI0+FIT_LAP/2, y+TAB_W/2);
               rect(XI1-FIT_LAP/2, y-TAB_W/2, XI1+T+FIT_LAP/2, y+TAB_W/2); }
}
module p_face() {                                  // lower, sits on the walls
  difference() {
    rect(BX0, BY0, BX1, BY1);
    for(j=[0:N-1]) for(i=[0:N-1]) at_cell(i,j)
      rect(-SLOT_X/2, -FACE_E, SLOT_X/2, FACE_E);
    face_tabs();
  }
}
module p_face2(shape="circle") {                   // upper, holds the apertures
  difference() {
    rect(BX0, BY0, BX1, BY1);
    for(j=[0:N-1]) for(i=[0:N-1])
      // The rod cams CAM sideways on its way to latching, and the cap goes with
      // it, so the aperture has to be that much bigger AND offset by half of it
      // so both ends of the travel clear equally. Sizing it on CAP_FIT alone
      // left 0.300 per side against 0.925 of cam: the cap jams on the rim.
      translate([px(j), py(i) - CAM/2])
        cap_outline(shape, CAP_D + CAP_FIT + CAM);
  }
}
module v_face()  sheetXY(FACE_Z)  p_face();
module v_face2(shape="circle") sheetXY(FACE2_Z) p_face2(shape);

module p_rail() {
  difference() {
    union() {
      rect(YI0, RAIL_Z0, YI1, RAIL_Z1);
      rect(YI0-T, RAIL_Z0+4, YI0, RAIL_Z0+16);
      rect(YI1, RAIL_Z0+4, YI1+T, RAIL_Z0+16);
    }
    rect(LP_Y0-6, LP_Z-0.2, LP_Y1+6, LP_Z+T+0.2);
  }
}
module v_rail() sheetYZ(RAIL_X0+T/2) p_rail();

// ---------------------------------------------------------------------------
// CRANKS and PIVOT HARDWARE
// ---------------------------------------------------------------------------
HORN_SCREW_P = 4.5; HORN_SCREW_D = 1.8;
module crank_body(r) {
  difference() {
    hull() { circle(d=CRANK_HUB); translate([r,0]) circle(d=CRANK_HUB*0.72); }
    circle(d=SV_SPLINE_D+0.4);
    for(s=[-1,1]) translate([s*HORN_SCREW_P,0]) circle(d=HORN_SCREW_D);
    translate([r,0]) circle(d=CRANK_BORE);
  }
}
module p_crank()      crank_body(CRANK_R);
module p_latchcrank() crank_body(LCRANK_R);
module p_washer() { difference() { circle(d=WASH_D); circle(d=LUG_BORE); } }

// ---------------------------------------------------------------------------
// SERVO BRACKETS
// ---------------------------------------------------------------------------
module servo_cut(cu, cv) {
  translate([cu, cv]) square([SV_L+SV_FIT, SV_W+SV_FIT], center=true);
  for(s=[-1,1]) translate([cu+s*SV_HOLE_P/2, cv]) circle(d=SV_HOLE_D);
}
module servo_cut_v(cu, cv) {
  translate([cu, cv]) square([SV_W+SV_FIT, SV_L+SV_FIT], center=true);
  for(s=[-1,1]) translate([cu, cv+s*SV_HOLE_P/2]) circle(d=SV_HOLE_D);
}
module p_svbracket_row() {
  difference() {
    union() {
      rect(-16, BASE_Z+T, 132, DECK_Z+T);
      for(y=[-8, 40, 78, 126]) rect(y-TAB_W/2, BASE_Z, y+TAB_W/2, BASE_Z+T);
    }
    for(i=[0:N-1]) servo_cut(py(i)+ROW_BAR_Y, RSV_Z);
  }
}
module p_svbracket_col() {
  difference() {
    union() {
      rect(-26, BASE_Z+T, 124, CSV_Z+18);
      for(x=[-20, 40, 78, 118]) rect(x-TAB_W/2, BASE_Z, x+TAB_W/2, BASE_Z+T);
    }
    for(j=[0:N-1]) servo_cut(COL_BAR_X + px(j), CSV_Z);
  }
}
module v_svbracket_row() sheetYZ(RSV_BRK) p_svbracket_row();
module v_svbracket_col() sheetXZ(CSV_BRK) p_svbracket_col();

// The latch servo is TURNED 90 about Z: its long axis runs along X, where there
// is room, instead of along Y, where the wall is 12mm away. In Y it now needs
// SV_W (12.2) rather than SV_L (22.8), which is what stopped it hanging out
// through the back of the machine.
module servo_cut_h(cu, cv) {
  translate([cu, cv]) square([SV_L+SV_FIT, SV_W+SV_FIT], center=true);
  for(s=[-1,1]) translate([cu+s*SV_HOLE_P/2, cv]) circle(d=SV_HOLE_D);
}
// Sized off the SERVO, not off the ribs. Off the ribs it came out 24 wide for a
// flange that spans 32.2, so the window ran off the edge and there was nothing
// left to screw into.
module p_latchbracket() {
  difference() {
    rect(min(LRIB_X[0]-6, LSV_X-SV_SHAFT_OFF-SV_TAB_SPAN/2-4), LRIB_Y0-1,
         max(LRIB_X[1]+6, LSV_X-SV_SHAFT_OFF+SV_TAB_SPAN/2+4), LRIB_Y1+1);
    servo_cut_h(LSV_X - SV_SHAFT_OFF, LSV_Y);
    for(rx=LRIB_X) rect(rx-(T+FIT_LAP)/2, LRIB_Y0+1, rx+(T+FIT_LAP)/2, LRIB_Y1-1);
  }
}
module v_latchbracket() sheetXY(LSV_BRK_Z) p_latchbracket();

module p_latchrib() {
  union() {
    difference() {
      rect(LRIB_Y0+1, BASE_Z+T, LRIB_Y1, LSV_BRK_Z);
      rect(LRIB_Y0+1-EPS, DECK_Z, LRIB_Y0+6, DECK_Z+T+FIT_LAP);
    }
    for(y=[LRIB_Y0+6, LRIB_Y1-5]) rect(y-TAB_W/2, BASE_Z, y+TAB_W/2, BASE_Z+T);
    for(y=[LRIB_Y0+6, LRIB_Y1-5]) rect(y-TAB_W/2, LSV_BRK_Z, y+TAB_W/2, LSV_BRK_Z+T);
  }
}
module v_latchrib() sheetYZ(LRIB_X[0]) p_latchrib();

// ---------------------------------------------------------------------------
// FRAME
// ---------------------------------------------------------------------------
module p_base() {
  difference() {
    rect(BX0, BY0, BX1, BY1);
    for(x=WTX) { rect(x-TAB_W/2, YI0-T-FIT_LAP/2, x+TAB_W/2, YI0+FIT_LAP/2);
                 rect(x-TAB_W/2, YI1-FIT_LAP/2, x+TAB_W/2, YI1+T+FIT_LAP/2); }
    for(y=WTY) { rect(XI0-T-FIT_LAP/2, y-TAB_W/2, XI0+FIT_LAP/2, y+TAB_W/2);
                 rect(XI1-FIT_LAP/2, y-TAB_W/2, XI1+T+FIT_LAP/2, y+TAB_W/2); }
    for(y=[-8, 40, 78, 126])
      rect(RSV_BRK-(T+FIT_LAP)/2, y-TAB_W/2, RSV_BRK+(T+FIT_LAP)/2, y+TAB_W/2);
    for(x=[-20, 40, 78, 118])
      rect(x-TAB_W/2, CSV_BRK-(T+FIT_LAP)/2, x+TAB_W/2, CSV_BRK+(T+FIT_LAP)/2);
    for(rx=LRIB_X) for(y=[LRIB_Y0+6, LRIB_Y1-5])
      rect(rx-(T+FIT_LAP)/2, y-TAB_W/2, rx+(T+FIT_LAP)/2, y+TAB_W/2);
  }
}
module v_base() sheetXY(BASE_Z) p_base();

TAB_Z = [10, 34, 58, 78];   // all must fit under WALL_TOP
module p_wallx() {
  difference() {
    union() {
      rect(BY0, BASE_Z+T, BY1, WALL_TOP);
      for(y=WTY) { rect(y-TAB_W/2, BASE_Z, y+TAB_W/2, BASE_Z+T);
                   rect(y-TAB_W/2, WALL_TOP, y+TAB_W/2, WALL_TOP+T); }
    }
    for(y=DECK_TAB_Y) rect(y-TAB_W/2, DECK_Z, y+TAB_W/2, DECK_Z+T+FIT_LAP);
    for(z=TAB_Z) { rect(BY0-EPS, z, BY0+T+FIT_LAP, z+TAB_W);
                   rect(BY1-T-FIT_LAP, z, BY1+EPS, z+TAB_W); }
  }
}
module v_wallx() sheetYZ(XI0-T/2) p_wallx();

module p_wally() {
  difference() {
    union() {
      rect(XI0, BASE_Z+T, XI1, WALL_TOP);
      for(x=WTX) { rect(x-TAB_W/2, BASE_Z, x+TAB_W/2, BASE_Z+T);
                   rect(x-TAB_W/2, WALL_TOP, x+TAB_W/2, WALL_TOP+T); }
      for(z=TAB_Z) { rect(XI0-T, z, XI0, z+TAB_W); rect(XI1, z, XI1+T, z+TAB_W); }
    }
    for(x=DECK_TAB_X) rect(x-TAB_W/2, DECK_Z, x+TAB_W/2, DECK_Z+T+FIT_LAP);
    for(rx=[RAIL_X0, RAIL_X1]) rect(rx-FIT_LAP/2, RAIL_Z0+4, rx+T+FIT_LAP/2, RAIL_Z0+16);
  }
}
module v_wally() sheetXZ(YI0-T/2) p_wally();

module p_coupon() {
  difference() {
    rect(0,0,124,54);
    translate([10,44]) square([T+FIT_SLIP, 9], center=true);
    translate([22,44]) square([T+FIT_LAP, 9], center=true);
    translate([34,44]) square([TEN_W+FIT_TEN, T+FIT_TEN], center=true);
    translate([48,44]) circle(d=LUG_BORE);
    translate([58,44]) circle(d=LINK_BORE);
    translate([72,44]) square([LUG_W+FIT_PSLIP, T+FIT_PSLIP], center=true);   // printed lug gauge
    translate([92,44]) square([T+FIT_TEN, PIN_W+FIT_TEN], center=true);
    rect(6, 4, 6+T, 24);
    rect(16, 4, 16+TEN_W, 24);
    servo_cut(70, 18);
    translate([110,18]) circle(d=SV_SPLINE_D+0.4);
    for(s=[-1,1]) translate([110+s*HORN_SCREW_P,18]) circle(d=HORN_SCREW_D);
  }
}

// ---- local frame exports --------------------------------------------------
module m_crank_row()   sheetYZ(0) p_crank();
module m_crank_col()   sheetXZ(0) p_crank();
module m_crank_latch() sheetXY(-T/2) p_latchcrank();
module m_washer_y()    sheetXZ(0) p_washer();
module m_washer_x()    sheetYZ(0) p_washer();
module m_washer_z()    sheetXY(-T/2) p_washer();
module m_pivot()       rotate([-90,0,0]) cylinder(h=PIV_LEN, d=ROD_D, $fn=24);
module m_crankpin_row() rotate([0,90,0]) cylinder(h=CKP_LEN, d=ROD_D, $fn=24);
module m_crankpin_col() rotate([-90,0,0]) cylinder(h=CKP_LEN, d=ROD_D, $fn=24);
module m_crankpin_latch() cylinder(h=CKP_LEN_L, d=ROD_D, $fn=24);

// ---------------------------------------------------------------------------
part = "none";
mode = "2d";
shape = "circle";
module dispatch2d() {
  if      (part=="rowbar")        p_rowbar();
  else if (part=="colbar")        p_colbar();
  else if (part=="rowlug")        p_rowlug();
  else if (part=="collug")        p_collug();
  else if (part=="link")          p_link();
  else if (part=="rod")           p_rod();
  else if (part=="cap")           p_cap(shape);
  else if (part=="rowguide")      p_rowguide();
  else if (part=="rowdrive")      p_rowdrive();
  else if (part=="colguide")      p_colguide();
  else if (part=="coldrive")      p_coldrive();
  else if (part=="deck")          p_deck();
  else if (part=="latch")         p_latch();
  else if (part=="face")          p_face();
  else if (part=="face2")         p_face2(shape);
  else if (part=="rail")          p_rail();
  else if (part=="base")          p_base();
  else if (part=="wallx")         p_wallx();
  else if (part=="wally")         p_wally();
  else if (part=="svbracket_row") p_svbracket_row();
  else if (part=="svbracket_col") p_svbracket_col();
  else if (part=="latchbracket")  p_latchbracket();
  else if (part=="latchrib")      p_latchrib();
  else if (part=="crank")         p_crank();
  else if (part=="latchcrank")    p_latchcrank();
  else if (part=="washer")        p_washer();
  else if (part=="coupon")        p_coupon();
}
module dispatch3d() {
  if      (part=="rowbar")        v_rowbar();
  else if (part=="colbar")        v_colbar();
  else if (part=="rowlug")        v_rowlug();
  else if (part=="collug")        v_collug();
  else if (part=="link")          v_link();
  else if (part=="rod")           v_rod();
  else if (part=="cap")           linear_extrude(T) p_cap(shape);
  else if (part=="rowguide")      v_rowguide();
  else if (part=="rowdrive")      v_rowdrive();
  else if (part=="colguide")      v_colguide();
  else if (part=="coldrive")      v_coldrive();
  else if (part=="deck")          v_deck();
  else if (part=="latch")         v_latch();
  else if (part=="face")          v_face();
  else if (part=="face2")         v_face2(shape);
  else if (part=="rail")          v_rail();
  else if (part=="base")          v_base();
  else if (part=="wallx")         v_wallx();
  else if (part=="wally")         v_wally();
  else if (part=="svbracket_row") v_svbracket_row();
  else if (part=="svbracket_col") v_svbracket_col();
  else if (part=="latchbracket")  v_latchbracket();
  else if (part=="latchrib")      v_latchrib();
  else if (part=="m_crank_row")   m_crank_row();
  else if (part=="m_crank_col")   m_crank_col();
  else if (part=="m_crank_latch") m_crank_latch();
  else if (part=="m_washer_y")    m_washer_y();
  else if (part=="m_washer_x")    m_washer_x();
  else if (part=="m_washer_z")    m_washer_z();
  else if (part=="m_pivot")       m_pivot();
  else if (part=="m_crankpin_row") m_crankpin_row();
  else if (part=="m_crankpin_col") m_crankpin_col();
  else if (part=="m_crankpin_latch") m_crankpin_latch();
  else                            linear_extrude(T) dispatch2d();
}
if (mode=="2d") dispatch2d(); else dispatch3d();
