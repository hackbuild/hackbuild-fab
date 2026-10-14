// ===========================================================================
// OGEE R16-P - the same machine as a PRINTED assembly.
//
// The laser cut version is 183 pieces because a laser only makes flat parts and
// every joint has to be a tab. A printer does not care, so:
//   bar + its 4 pivot lugs + drive lug + guide lug   -> ONE part  (8 off)
//   base + 4 walls + 2 latch rails + deck ledges     -> ONE tray  (1 off)
//   lower face + upper face                          -> ONE plate with a
//                                                       stepped cap pocket
//   rod + cap                                        -> ONE part  (16 off)
//   the 41 keeper washers                            -> gone, the pins have
//                                                       printed heads
// 183 pieces becomes 91.
//
// And it is driven BY HAND. Each of the eight bars gets a knob on the outside
// of the box: crank and shaft print as one piece, the knob presses on. The
// crank geometry is untouched, so the kinematics are the ones already verified.
// The latch plate grows a finger tab that comes out through a slot in the wall.
// ===========================================================================
include <params.scad>
use <ogee16.scad>

// FITS. A 0.4mm nozzle does not print what you drew: holes and slots come out
// UNDERSIZE by roughly 0.15 (inside corners get overfilled) and outside features
// come out OVERSIZE by roughly 0.10, so about 0.25 of any drawn clearance is
// eaten before the parts ever meet. Every fit below is drawn for what is left.
//   SLIDE  parts that move against each other every actuation   0.55 drawn
//   LOCATE goes together by hand and stays, no motion           0.30 drawn
//   PRESS  must not come apart                                  0.10 drawn
FDM_LOSS    = 0.25;
// 0.75, up from 0.55. At 0.55 drawn the sliding fits left 0.30 of real
// clearance, which is in band on paper and still feels tight in the hand. 0.75
// leaves 0.50, which is what a printed part that moves every actuation wants.
FIT_SLIDE   = 0.75;
FIT_LOCATE  = 0.30;
FIT_PRESS   = 0.10;
PRINT_GAP   = FIT_SLIDE/2;   // per side, for the running fits
SHAFT_D     = 8.0;    // knob shaft through the wall
SHAFT_FLAT  = 6.4;    // D flat, so the knob cannot slip
KNOB_D      = 26;
KNOB_H      = 10;
KNOB_FLUTES = 12;
PIN_HEAD_D  = 7.0;
PIN_HEAD_H  = 1.6;
PIN_FREE    = T + 0.9;
PIN_PRESS   = 4.2;
TAB_L       = 16;     // latch plate finger tab, out through the wall
LEDGE       = 6;      // deck ledge width inside the walls

module sXZ(yc,t=T) { translate([0,yc+t/2,0]) rotate([90,0,0]) linear_extrude(t) children(); }
module sYZ(xc,t=T) { translate([xc-t/2,0,0]) rotate([90,0,90]) linear_extrude(t) children(); }
module sXY(z0,t=T) { translate([0,0,z0]) linear_extrude(t) children(); }

// ---------------------------------------------------------------------------
// BAR ASSEMBLIES. Bar, its four pivot lugs, its drive lug and its guide lug,
// all one solid. No mortises, no tenons, no lamination, no cement.
// ---------------------------------------------------------------------------
module a_rowbar() {
  union() {
    sXY(RB_Z, TB) rect(BAR_X0, ROW_BAR_Y-RBW/2, BAR_X1, ROW_BAR_Y+RBW/2);
    for(j=[0:N-1]) translate([px(j),0,0]) rotate(DIAG) {
      translate([C,0,0]) sXZ(YOFF) p_rowlug();
    }
    sYZ(DRIVE_X) p_rowdrive();
    for(g=GUIDE_X) translate([g-GUIDE_X[0],0,0]) sYZ(GUIDE_X[0]) p_rowguide();
  }
}
// The column bar's drive and guide lugs ran all the way to the floor, because in
// the cut version that is what the bar lands on. That makes the assembly
// unprintable in EVERY pose: it stands on three little feet with the bar 17mm in
// the air, 120 mm2 of bed contact against 1891 of overhang, and orient.py says
// the best of 24 poses is still only 124. So the feet are cut off at the bar's
// underside and the stops move onto the base as printed bosses. Now it prints
// exactly like the row bar: flat on its own 162x12 face.
module a_colbar() {
  intersection() {
  union() {
    sXY(CB_Z, TB) rect(COL_BAR_X-CBW/2, BAR_Y0, COL_BAR_X+CBW/2, BAR_Y1);
    for(i=[0:N-1]) translate([0,py(i),0]) rotate(DIAG) {
      translate([-C,0,0]) sXZ(-YOFF) p_collug();
    }
    sXZ(DRIVE_Y) p_coldrive();
    for(g=GUIDE_Y) translate([0,g-GUIDE_Y[0],0]) sXZ(GUIDE_Y[0]) p_colguide();
  }
  translate([-300,-300,CB_Z]) cube([900,900,300]);
  }
}
COLSTOP_Y = [-26, 124];      // clear of every row bar and of the latch ribs
module a_base() {
  union() {
    fr() p_base();
    for(j=[0:N-1]) for(y=COLSTOP_Y)
      translate([COL_BAR_X+px(j)-6, y-5, T-0.01])
        cube([12, 10, CB_Z-T+0.01]);
  }
}

// ---------------------------------------------------------------------------
// ROD + CAP as one part. The cap is no longer a separate mortised piece, so the
// shape is baked in at print time rather than swapped.
// ---------------------------------------------------------------------------
// Rod and cap are NOT combined. Fusing them looked like a free win until you
// try to assemble it: the lower face layer is a 3.4 x 13.2 rod slot and the cap
// is 16 across, so a rod with a cap on it can only go in from ABOVE, dropped
// blind through an 18mm hole onto a link crown 40mm below. Separate, the rod
// goes in from inside where you can see it, the face goes on, and the caps press
// onto the tenons from the top. It also gets the swappable cap shape back.
module a_rod(shape="circle") {
  translate([0, PIN_PLAY, CROWN_TOP]) sYZ(0) p_rod();
}
module a_cap(shape="circle") {
  translate([0, PIN_PLAY, FACE2_Z]) linear_extrude(T) p_cap(shape);
}

// ---------------------------------------------------------------------------
// FACE. Both layers in one 6mm plate: the rod slot goes all the way through,
// the cap pocket is a 3mm recess in the top so a set pixel still sits flush.
// ---------------------------------------------------------------------------
module a_face(shape="circle") {
  difference() {
    // the wall top tabs need their slots back: the one-piece tray had plain
    // walls with no tabs, the split walls do not
    sXY(FACE_Z, 2*T) difference() { rect(BX0, BY0, BX1, BY1); face_tabs(); }
    for(j=[0:N-1]) for(i=[0:N-1]) {
      translate([px(j),py(i),FACE_Z-1]) linear_extrude(2*T+2)
        rotate(DIAG) rect(-SLOT_X/2-PRINT_SHRINK, -FACE_E,
                           SLOT_X/2+PRINT_SHRINK,  FACE_E);
      // sized and offset for the rod's CAM travel, same as the cut face
      translate([px(j), py(i)-CAM/2, FACE2_Z]) linear_extrude(T+1)
        cap_outline(shape, CAP_D + CAM + FIT_SLIDE);
    }
  }
}

// ---------------------------------------------------------------------------
// TRAY. Base, four walls, both latch rails, ledges for the deck, the eight
// knob bores and the slot the latch tab comes out of.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// FRAME, as SEPARATE PLATES. The one-piece tray was a 350cm3 monolith and the
// wrong call for a printer: it is one very long print with no recovery if it
// fails, and it wastes a bed. These are the laser frame profiles printed flat
// and tabbed together exactly as the cut version is, with one extra clearance
// added by shrinking every profile PRINT_SHRINK all round, which thins each tab
// and widens each slot in a single operation.
// 0.05, not 0.075. The shrink applies to BOTH halves of a frame joint, so it
// contributes 4x itself to a tab-in-slot clearance. At 0.075 that put every tab
// at 0.45 when a LOCATE fit wants 0.25-0.40; at 0.05 it lands on 0.35, and the
// sliding fits it also widens stay inside the SLIDE band.
PRINT_SHRINK = 0.05;
RAIL_GAP = (FIT_SLIDE - 4*PRINT_SHRINK)/2;   // the plate is shrunk too
module fr() { linear_extrude(T) offset(delta=-PRINT_SHRINK) children(); }

// +X wall carries the four row knob bores
module p_wall_xp() {
  difference() {
    p_wallx();
    for(i=[0:N-1]) translate([py(i)+ROW_BAR_Y, RSV_Z])
      circle(d=SHAFT_D+2*PRINT_GAP, $fn=48);
  }
}
// -X wall carries the latch tab slot
module p_wall_xn() {
  difference() {
    p_wallx();
    // long enough in Y for the 3mm pull, only clearance in Z
    rect(LTAB_Y-LTAB_W/2-LP_SLIDE-1, LP_Z-PRINT_GAP,
         LTAB_Y+LTAB_W/2+LP_SLIDE+1, LP_Z+T+PRINT_GAP);
  }
}
// +Y wall carries the four column knob bores
module p_wall_yp() {
  difference() {
    p_wally();
    for(j=[0:N-1]) translate([COL_BAR_X+px(j), CSV_Z])
      circle(d=SHAFT_D+2*PRINT_GAP, $fn=48);
  }
}
module p_wall_yn() p_wally();

// ---------------------------------------------------------------------------
// LATCH PLATE with its finger tab. Everything else about it is unchanged.
// ---------------------------------------------------------------------------
LTAB_W  = 8;      // tab width in Y
LTAB_X  = -49;    // how far the tab reaches past the wall
LPULL_W = 24;     // knob across
LPULL_L = 12;     // knob along the pull
LPULL_H = 11;
module a_latch() {
  sXY(LP_Z) offset(delta=-PRINT_SHRINK) union() {
    p_latch();
    rect(LTAB_X, LTAB_Y-LTAB_W/2, LP_X0+1, LTAB_Y+LTAB_W/2);
  }
}
// PULL KNOB. The tab alone stood 2mm proud of the wall, which is a fingernail
// not a handle. This presses onto the end of it: a paddle with a slot in its
// inner face, ridged on the outer face so a thumb can find it without looking.
module p_latchpull() {                 // profile (u,v) -> (y,z), pull along x
  difference() {
    hull() {
      translate([-LPULL_W/2+3, -LPULL_H/2+3]) circle(r=3, $fn=32);
      translate([ LPULL_W/2-3, -LPULL_H/2+3]) circle(r=3, $fn=32);
      translate([-LPULL_W/2+3,  LPULL_H/2-3]) circle(r=3, $fn=32);
      translate([ LPULL_W/2-3,  LPULL_H/2-3]) circle(r=3, $fn=32);
    }
    for(k=[-1,0,1]) translate([k*5, LPULL_H/2]) circle(d=3.4, $fn=24);
  }
}
module a_latchpull() {                 // solid, slot opening toward +x
  difference() {
    translate([LTAB_X-3, LTAB_Y, LP_Z+T/2]) rotate([90,0,90])
      linear_extrude(LPULL_L) p_latchpull();
    // PRESS onto the tab. It is a handle, it has to stay on
    translate([LTAB_X-1, LTAB_Y-(LTAB_W+FIT_PRESS)/2, LP_Z-FIT_PRESS/2])
      cube([LPULL_L, LTAB_W+FIT_PRESS, T+FIT_PRESS]);
  }
}

// ---------------------------------------------------------------------------
// HAND DRIVE. The crank is the one already verified; a shaft grows out of its
// hub, through the wall, and the knob presses onto the D at the far end.
// ---------------------------------------------------------------------------
// The laser build has a separate 3mm rod for the crank pin. Printed, that pin is
// a boss on the crank itself: one less loose part and nothing to glue.
//
// The first version butted a 2.85 stub on the FACE of a 3mm plate and stuck out
// 6mm. That is a 2.85 diameter bond carrying the whole drive load on a
// cantilever twice as long as it needs to be, and it would have snapped.
// Now it runs THROUGH the plate, so 3mm of it is buried and the joint is the
// full plate thickness rather than one face, and it protrudes only as far as it
// has to. There is exactly 0.5mm of air between the crank face and the drive
// lug, so that is all the root fillet can be, and it is used.
YOKE_H    = T + FIT_SLIP;
BOSS_D    = YOKE_H - FIT_SLIDE;   // 2.85, fills the yoke slot to a SLIDE fit
BOSS_L    = 4.5;                  // reach past the lug's far face by 1.0
BOSS_GAP  = 0.5;                  // the whole gap, spent on the fillet
PIN_HEAD2_D = 5.5;
PIN_HEAD2_H = 1.5;
// A SEPARATE PRESSED PIN, not a moulded stub. Two reasons. It is fragile to
// handle as a stub however well filleted, and worse, it wrecks the print: with
// the boss on it the crank shaft has to stand either on the boss tip (6 mm2 of
// bed) or on its own shaft end (48 mm2, a 51mm post on a 50mm2 foot). Split off,
// the shaft stands on its crank at 103 mm2 with 2 mm2 overhanging, and the pin
// is a trivial 9.5mm part that prints head down.
// It is pressed through the crank's own bore with a head on the far face, which
// is a far better anchorage than any face joint, and the drive load is 0.22 N.
// EVERY pin head is RECESSED into a counterbore in its crank. A proud head on a
// rotating crank sweeps a ring, and on every one of these cranks that ring lands
// on the servo case: 0.5mm on the latch, and 0.7mm of actual overlap on the
// eight bar cranks, whose heads point outboard straight at their own servo.
// Flush heads, and the gap the horn sits in stays empty.
module pin_seat() {               // the counterbore drive_pin_flush sits in
  translate([0,0,-0.01]) cylinder(d=PIN_HEAD2_D+0.2, h=PIN_HEAD2_H+0.11, $fn=32);
}
module drive_pin_flush() {
  cylinder(d=PIN_HEAD2_D, h=PIN_HEAD2_H, $fn=32);              // in the counterbore
  cylinder(d=CRANK_BORE, h=T, $fn=24);                         // PRESS in the bore
  cylinder(d=BOSS_D, h=T+BOSS_GAP+BOSS_L, $fn=24);
  translate([0,0,T]) cylinder(d1=BOSS_D+1.0, d2=BOSS_D, h=BOSS_GAP, $fn=24);
}
module drive_pin() {              // legacy proud-head form, no longer used
                                  // root at z=0 = the crank's OUTER face
  translate([0,0,-PIN_HEAD2_H]) cylinder(d=PIN_HEAD2_D, h=PIN_HEAD2_H, $fn=32);
  cylinder(d=CRANK_BORE, h=T, $fn=24);                       // PRESS in the bore
  cylinder(d=BOSS_D, h=T+BOSS_GAP+BOSS_L, $fn=24);
  translate([0,0,T]) cylinder(d1=BOSS_D+1.0, d2=BOSS_D, h=BOSS_GAP, $fn=24);
}
module drive_boss() { drive_pin(); }   // the sim sees it assembled
// RETAINING COLLAR and HUB.
//
// A bore is not a bearing. The wall bore lets the shaft turn and does nothing to
// hold it in: pull a knob and the shaft walks 29mm before anything stops it,
// taking the crank clean out of its yoke. And 3mm of plate on an 8mm shaft is
// L/D 0.375, which on the skeletonised wall is a 2.6mm ring of material with a
// knob levering on it.
//
// So each bore gets a HUB, a boss projecting inward, which buys the bearing
// length and the material at once: 8mm of bearing, L/D 1.0, and 4mm of wall all
// round the bore. And the shaft gets a COLLAR sitting 0.5 inboard of that hub, so
// the hub and wall together are trapped between collar and knob.
//
// The collar never has to pass through the bore, because the shaft goes in from
// INSIDE and only its plain end comes out. Its underside is a 45 degree cone so
// it prints unsupported on a shaft standing on its crank.
HUB_D      = 16.0;
HUB_L      = 5.0;
COLLAR_D   = 11.0;
COLLAR_H   = 2.0;
COLLAR_GAP = 0.5;
// the wall as ONE part in local coords: plate at z 0..T, hub reaching to -HUB_L
// on the INNER side. Both exports are placements of this, so they cannot drift
// apart the way the print and assembly versions just did.
// OpenSCAD cannot take a module as a parameter, so these are written out.
module wallx_hubbed() {
  union() {
    linear_extrude(T) offset(delta=-PRINT_SHRINK)
      offset(delta=-0.10) offset(delta=0.10) p_wall_xp();
    for(i=[0:N-1]) translate([py(i)+ROW_BAR_Y, RSV_Z, -HUB_L]) knob_hub();
  }
}
// the Y wall carries its hub on the +z side, because the placement that keeps its
// profile the right way up sends +z inward. The X wall's placement sends -z
// inward. Same part, opposite convention, and getting it backwards mirrors the
// whole wall, which shows up as 4 bodies and an x range of -163..39.
// Same convention as the X wall: plate at local z 0..T, hub reaching to -HUB_L.
// The profile is MIRRORED in y because the placement that puts the hub inboard
// (rotate -90 about X) also flips the profile's height. Getting this wrong put
// the plate 5mm inboard with the hub sticking out, which read as the Y wall
// colliding with the X wall at every corner.
module wally_hubbed() {
  union() {
    linear_extrude(T) mirror([0,1,0]) offset(delta=-PRINT_SHRINK)
      offset(delta=-0.10) offset(delta=0.10) p_wall_yp();
    for(j=[0:N-1]) translate([px(j)+COL_BAR_X, -CSV_Z, -HUB_L]) knob_hub();
  }
}
module knob_hub() {
  difference() {
    union() {
      cylinder(d=HUB_D, h=HUB_L+T, $fn=48);
      // fillet at the root. In the hub-up print pose it is a cone widening
      // downward, so it is self supporting, and it moves the stress off a
      // square corner
      translate([0,0,HUB_L]) cylinder(d1=HUB_D+3, d2=HUB_D, h=1.5, $fn=48);
    }
    translate([0,0,-1]) cylinder(d=SHAFT_D+FIT_SLIDE, h=HUB_L+T+2, $fn=48);
  }
}
module retainer() {              // collar top at z=0, built downward
  translate([0,0,-COLLAR_H]) cylinder(d=COLLAR_D, h=COLLAR_H, $fn=48);
  translate([0,0,-COLLAR_H-1.5]) cylinder(d1=SHAFT_D, d2=COLLAR_D, h=1.5, $fn=48);
}
module a_shaft_row(pin=true) {            // axis along +X
  L = (XI1 + 2*T + 12) - RSV_CRK;
  difference() {
  union() {
    sYZ(RSV_CRK) difference() { p_crank();
      circle(d=SV_SPLINE_D+0.4); }
    if(pin) translate([RSV_CRK+T/2, CRANK_R, 0]) rotate([0,-90,0]) drive_pin_flush();
    translate([RSV_CRK, 0, 0]) rotate([0,90,0]) difference() {
      cylinder(d=SHAFT_D, h=L, $fn=48);
      translate([-SHAFT_D, SHAFT_FLAT/2, L-14]) cube([2*SHAFT_D, SHAFT_D, 15]);
    }
    translate([XI1+T-HUB_L-COLLAR_GAP, 0, 0]) rotate([0,90,0]) retainer();
  }
  translate([RSV_CRK+T/2, CRANK_R, 0]) rotate([0,-90,0]) pin_seat();
  }
}
module a_shaft_col(pin=true) {            // axis along +Y
  L = (YI1 + 2*T + 12) - CSV_CRK;
  difference() {
  union() {
    sXZ(CSV_CRK) difference() { p_crank(); circle(d=SV_SPLINE_D+0.4); }
    if(pin) translate([CRANK_R, CSV_CRK+T/2, 0]) rotate([90,0,0]) drive_pin_flush();
    translate([0, CSV_CRK, 0]) rotate([-90,0,0]) difference() {
      cylinder(d=SHAFT_D, h=L, $fn=48);
      translate([-SHAFT_D, SHAFT_FLAT/2, L-14]) cube([2*SHAFT_D, SHAFT_D, 15]);
    }
    translate([0, YI1+T-HUB_L-COLLAR_GAP, 0]) rotate([-90,0,0]) retainer();
  }
  translate([CRANK_R, CSV_CRK+T/2, 0]) rotate([90,0,0]) pin_seat();
  }
}
module a_knob() {
  difference() {
    union() {
      cylinder(d=KNOB_D, h=KNOB_H, $fn=96);
      for(k=[0:KNOB_FLUTES-1]) rotate(360*k/KNOB_FLUTES)
        translate([KNOB_D/2,0,0]) cylinder(d=3.2, h=KNOB_H, $fn=16);
    }
    // PRESS, not slide: a knob that turns on its own shaft is useless
    translate([0,0,-1]) difference() {
      cylinder(d=SHAFT_D+FIT_PRESS, h=KNOB_H+2, $fn=48);
      translate([-SHAFT_D, SHAFT_FLAT/2+FIT_PRESS/2, 0]) cube([2*SHAFT_D, SHAFT_D, KNOB_H+4]);
    }
    // pointer flat so you can see where the stroke is
    translate([KNOB_D/2-5, -1.2, KNOB_H-1]) cube([6, 2.4, 2]);
  }
}

// ---------------------------------------------------------------------------
// PIVOT PIN with a printed head. Presses into the lug, turns in the link, and
// the head replaces the cemented washer.
// ---------------------------------------------------------------------------
// PIVOT PIN. The original snap pin with the slot filled in. Nothing else about
// it changed: same head, same shank, same 3.8 barb, same 3.0 lead-in cone.
//
// The cone is the part that does the work. It is long and shallow, 1.6 at the tip
// opening out to 3.8, so it starts by hand and wedges its way through, swaging
// the lug bore as it goes. The slot was only ever there to let the barb collapse,
// and at this size it does not need to. Losing it loses the two 0.73mm legs that
// made the part unprintable and changes nothing else.
PIN_HEAD2_D = 6.0;
PIN_HEAD2_H = 1.5;
PIN_SH_D    = LINK_BORE - FIT_SLIDE;   // 2.65, the link turns on this
PIN_SH_L    = T + PRINT_GAP + T;       // link, gap, lug
PIN_BARB_D  = 3.8;
PIN_LEDGE   = 0.4;
PIN_BARB_L  = 3.0;
PIN_LEN     = PIN_HEAD2_H + PIN_SH_L + PIN_LEDGE + PIN_BARB_L;
module a_pivot() {
  cylinder(d=PIN_HEAD2_D, h=PIN_HEAD2_H, $fn=48);
  cylinder(d=PIN_SH_D, h=PIN_HEAD2_H+PIN_SH_L, $fn=32);
  translate([0,0,PIN_HEAD2_H+PIN_SH_L])
    cylinder(d=PIN_BARB_D, h=PIN_LEDGE, $fn=32);
  translate([0,0,PIN_HEAD2_H+PIN_SH_L+PIN_LEDGE])
    cylinder(d1=PIN_BARB_D, d2=1.6, h=PIN_BARB_L, $fn=32);
}

// ---------------------------------------------------------------------------
// SERVO DRIVE, as an alternative to the knobs. The frame does not change: the
// laser build's brackets and latch tower tab into slots the base and deck
// already carry, so the same tray takes either drive. With servos the crank is
// a separate piece on the horn instead of one end of a knob shaft, and the knob
// bores in the +X and +Y walls simply go unused.
module a_crank_row(pin=true) { difference() {
  union() { sYZ(RSV_CRK) p_crank();
    if(pin) translate([RSV_CRK+T/2, CRANK_R, 0]) rotate([0,-90,0]) drive_pin_flush(); }
  translate([RSV_CRK+T/2, CRANK_R, 0]) rotate([0,-90,0]) pin_seat(); } }
module a_crank_col(pin=true) { difference() {
  union() { sXZ(CSV_CRK) p_crank();
    if(pin) translate([CRANK_R, CSV_CRK+T/2, 0]) rotate([90,0,0]) drive_pin_flush(); }
  translate([CRANK_R, CSV_CRK+T/2, 0]) rotate([90,0,0]) pin_seat(); } }
// The latch crank had NO PIN, so nothing connected it to the plate at all. Same
// pressed pin as the bar cranks: crank z 72..75, 2mm of air, plate z 77..80, and
// drive_pin is T + 0.5 fillet + 4.5 boss = exactly 8.0, so the fillet lands in
// the gap and the boss engages the full 3mm of plate.
module a_crank_latch(pin=true) {
  difference() {
    translate([LSV_X, LSV_Y, LSV_SHAFT_Z]) linear_extrude(T) p_latchcrank();
    translate([LSV_X+LCRANK_R, LSV_Y, LSV_SHAFT_Z-0.01])
      cylinder(d=PIN_HEAD2_D+0.2, h=PIN_HEAD2_H+0.11, $fn=32);   // counterbore
  }
  if(pin) translate([LSV_X+LCRANK_R, LSV_Y, LSV_SHAFT_Z]) drive_pin_flush();
}
module a_sg90(x, y, z, rot=0) translate([x,y,z]) rotate([0,0,rot])
  cube([SV_L, SV_W, SV_H], center=true);

// LATCH SERVO TOWER. It stands on the DECK, not the floor. There is no reason
// for it to reach the base: the deck is a rigid 202mm plate 40mm up, so a
// bracket from there is 23.4 tall instead of 57.4, and everything below the deck
// stays clear. With the servo turned, its flange screws land at x -11.4 and
// 16.4, so the walls go straight under them and nothing cantilevers.
LT_WX  = [109, 130];         // walls: 109 clears col bar 3's drive lug at 100,
                             // 130 clears the row bracket at 134.1 and the rail
LT_Y0  = 113;  LT_Y1 = 129;  // clear of row bar 3, which ends at y 111.4
LT_X0  = 101;  LT_X1 = 136;  // shelf, covering the flange
LT_Z0  = DECK_Z + T;         // sits on the deck
module a_latchtower() {
  difference() {
    union() {
      translate([LT_X0, LT_Y0-2, LSV_BRK_Z])
        cube([LT_X1-LT_X0, (LT_Y1+2)-(LT_Y0-2), T]);              // shelf
      for(rx=LT_WX) translate([rx-T/2, LT_Y0, LT_Z0])
        cube([T, LT_Y1-LT_Y0, LSV_BRK_Z-LT_Z0+0.02]);             // walls
      translate([LT_WX[0]-T/2, LT_Y0, LT_Z0])
        cube([LT_WX[1]-LT_WX[0]+T, T, LSV_BRK_Z-LT_Z0+0.02]);     // back wall
      // feet land on the band of deck at y 113..118, inboard of the column
      // servo cutouts which start at 118
      for(rx=LT_WX) translate([rx-T/2, 113.5, DECK_Z]) cube([T, 4, T+0.02]);
    }
    translate([0,0,LSV_BRK_Z-1]) linear_extrude(T+2)
      servo_cut_h(LSV_X - SV_SHAFT_OFF, LSV_Y);
  }
}
// the printed deck fills the opening the cut version needs for its floor-standing
// ribs, and takes tab slots for this bracket's feet instead
module a_deck() {
  difference() {
    union() {
      offset(delta=-PRINT_SHRINK) p_deck();

    }
    for(rx=LT_WX)
      translate([rx, 115.5]) square([T+FIT_LAP, 4+FIT_LAP], center=true);
  }
}

// ---------------------------------------------------------------------------
// MINIMAL FRAME. The same parts with the middle of every empty area removed, so
// you can watch the mechanism work. Knob drive only: no servo brackets and no
// latch tower, so the slots those tabbed into are simply unused.
//
// The profiles come from skeleton.py, which reads the FULL part's own geometry and
// keeps a band round the outside, a collar round every hole, and a thin lattice on
// the bar lines. Nothing is redrawn, so every slot, bore and tab survives with
// material around it and a minimal part assembles exactly like the full one.
module skel(n) import(str("../out/skel/", n, ".dxf"));
// The COLUMN BAR SEATS. skeleton.py works on the 2D profile, and these are 3D
// bosses that only exist on the full base, so skeletonising quietly threw the
// column bars' landing away and left them resting on nothing. Each boss gets a
// pad under it too, because the lattice rib it lands on is only 4.4 wide.
module m_base() {
  union() {
    sXY(BASE_Z) offset(delta=-PRINT_SHRINK) skel("base");
    for(j=[0:N-1]) for(y=COLSTOP_Y) {
      translate([COL_BAR_X+px(j)-7, y-6, BASE_Z]) cube([14, 12, T]);
      translate([COL_BAR_X+px(j)-6, y-5, BASE_Z+T-0.01])
        cube([12, 10, CB_Z-BASE_Z-T+0.01]);
    }
  }
}
WALL_IN_X = XI1 + T;            // the +X wall's inner face
WALL_IN_Y = YI1 + T;
module hubs_x() for(i=[0:N-1])
  translate([WALL_IN_X-HUB_L, py(i)+ROW_BAR_Y, RSV_Z]) rotate([0,90,0]) knob_hub();
module hubs_y() for(j=[0:N-1])
  translate([px(j)+COL_BAR_X, WALL_IN_Y-HUB_L, CSV_Z]) rotate([-90,0,0]) knob_hub();
// The knob bores are a PRINTED-variant feature: they live in p_wall_xp, not in
// the lasercut p_wallx that skeleton.py reads. So the skeletonised wall came out
// SOLID behind every hub - 9.5mm of plate where the shaft has to pass. The bores
// are cut here, through skeleton and hub together.
module knob_bores_x() for(i=[0:N-1])
  translate([WALL_IN_X-HUB_L-1, py(i)+ROW_BAR_Y, RSV_Z]) rotate([0,90,0])
    cylinder(d=SHAFT_D+FIT_SLIDE, h=HUB_L+2*T+2, $fn=48);
module knob_bores_y() for(j=[0:N-1])
  translate([px(j)+COL_BAR_X, WALL_IN_Y-HUB_L-1, CSV_Z]) rotate([-90,0,0])
    cylinder(d=SHAFT_D+FIT_SLIDE, h=HUB_L+2*T+2, $fn=48);
module m_wallx(m) difference() {
  union() {
    sYZ(m ? XI1+T+T/2 : XI0-T/2) offset(delta=-PRINT_SHRINK) skel("wallx");
    if(m) hubs_x();
  }
  if(m) knob_bores_x();
}
module m_wally(m) difference() {
  union() {
    sXZ(m ? YI1+T+T/2 : YI0-T/2) offset(delta=-PRINT_SHRINK) skel("wally");
    if(m) hubs_y();
  }
  if(m) knob_bores_y();
}
module m_deck()   sXY(DECK_Z) offset(delta=-PRINT_SHRINK) skel("deck");
module m_face()   sXY(FACE_Z) offset(delta=-PRINT_SHRINK) skel("face");
module m_latch()  sXY(LP_Z) offset(delta=-PRINT_SHRINK)
                    union() { skel("latch");
                      rect(LTAB_X, LTAB_Y-LTAB_W/2, LP_X0+1, LTAB_Y+LTAB_W/2); }
module m_rail(m)  sYZ(m ? RAIL_X1+T/2 : RAIL_X0+T/2) offset(delta=-PRINT_SHRINK) skel("rail");

// ---------------------------------------------------------------------------
part = "none";
shape = "circle";
if      (part=="rowbar_asm") a_rowbar();
else if (part=="colbar_asm") a_colbar();
else if (part=="rod_asm")    a_rod(shape);
// PRINT ORIENTATIONS. Every part below assembles in one pose and prints best in
// another, so each has two exports. Measured before and after:
//   rod    16.7 mm2 of bed contact and 192 mm2 overhanging, standing on its
//          foot with the cap in the air. Flipped CAP DOWN the cap is a 256 mm2
//          raft and the rod is a plain vertical fin. Laying it on its face is
//          worse still, 5 mm2 and 438 overhanging, because the cap is centred
//          on the rod's plane and half of it ends up under the bed.
//   shaft  4.5 mm2, a line contact where a lying cylinder touches, and 334 mm2
//          overhanging. Stood on its crank the crank IS the raft. Use a brim.
else if (part=="rod")        rotate([0,90,0]) a_rod(shape);
else if (part=="cap")        a_cap(shape);
else if (part=="cap_asm")    a_cap(shape);
else if (part=="shaft_row")  rotate([0,-90,0]) a_shaft_row(false);
else if (part=="shaft_col")  rotate([90,0,0]) a_shaft_col(false);
else if (part=="shaft_row_asm") a_shaft_row();
else if (part=="shaft_col_asm") a_shaft_col();
else if (part=="face_asm")   a_face(shape);
else if (part=="base")       a_base();
else if (part=="m_base")     m_base();
else if (part=="m_base_asm") m_base();
else if (part=="m_wall_xp")     rotate([0,90,0]) m_wallx(true);   // hubs UP
else if (part=="m_wall_xp_asm")               m_wallx(true);
else if (part=="m_wall_xn")     rotate([0,-90,0]) m_wallx(false);
else if (part=="m_wall_xn_asm")               m_wallx(false);
else if (part=="m_wall_yp")     rotate([-90,0,0]) m_wally(true);  // hubs UP
else if (part=="m_wall_yp_asm")               m_wally(true);
else if (part=="m_wall_yn")     rotate([90,0,0]) m_wally(false);
else if (part=="m_wall_yn_asm")               m_wally(false);
else if (part=="m_deck")     m_deck();
else if (part=="m_deck_asm") m_deck();
else if (part=="m_face")     m_face();
else if (part=="m_face_asm") m_face();
else if (part=="m_latch")    m_latch();
else if (part=="m_latch_asm") m_latch();
else if (part=="m_rail")     rotate([0,-90,0]) m_rail(false);
else if (part=="m_rail_asm")               m_rail(false);
else if (part=="m_rail2_asm")              m_rail(true);
else if (part=="wall_xp")    translate([0,0,T]) rotate([0,180,0]) wallx_hubbed();
else if (part=="wall_xn")    fr() p_wall_xn();
else if (part=="wall_yp")    translate([0,0,T]) rotate([0,180,0]) mirror([0,1,0]) wally_hubbed();
else if (part=="wall_yn")    fr() p_wall_yn();
else if (part=="rail")       fr() p_rail();
else if (part=="base_asm")    a_base();
else if (part=="wall_xn_asm") sYZ(XI0-T/2) offset(delta=-PRINT_SHRINK)
                               offset(delta=-0.10) offset(delta=0.10) p_wall_xn();
else if (part=="wall_xp_asm") translate([XI1+T,0,0]) rotate([90,0,90]) wallx_hubbed();
else if (part=="wall_yn_asm") sXZ(YI0-T/2) offset(delta=-PRINT_SHRINK)
                               offset(delta=-0.10) offset(delta=0.10) p_wall_yn();
else if (part=="wall_yp_asm") translate([0,YI1+T,0]) rotate([-90,0,0]) wally_hubbed();
else if (part=="rail_asm")    sYZ(RAIL_X0+T/2) offset(delta=-PRINT_SHRINK) p_rail();
else if (part=="latch_asm")  a_latch();
// NOT a re-extrusion of the outline: that shipped a solid paddle with no
// mortise, so the pull had nothing to attach to. Print exports are the assembly
// part REORIENTED, never redrawn. render_print.py now compares volumes to make
// sure of it.
else if (part=="latchpull")     rotate([0,-90,0]) a_latchpull();
else if (part=="latchpull_asm") a_latchpull();
else if (part=="deck")       sXY(DECK_Z) a_deck();
// "link" is the PRINT orientation, flat on the bed. "link_asm" is the same part
// standing in its assembly frame, which is what the sim needs. Every other part
// happens to print in the orientation it assembles in; this one does not.
else if (part=="link")       linear_extrude(T) p_link();
else if (part=="link_asm")   sXZ(0) p_link();
// orient.py: flipping the knob takes bed contact 524 -> 565 and overhang 55 -> 14
else if (part=="svbracket_row") fr() p_svbracket_row();
else if (part=="svbracket_col") fr() p_svbracket_col();
else if (part=="latchtower")     rotate([180,0,0]) a_latchtower();   // shelf down: 510 mm2
else if (part=="latchtower_asm") a_latchtower();
else if (part=="crank")         rotate([0,90,0]) a_crank_row(false);
else if (part=="drivepin")      drive_pin_flush();   // one pin type, head recessed
else if (part=="crank_latch")   linear_extrude(T) p_latchcrank();   // pin is separate
else if (part=="svbracket_row_asm") sYZ(RSV_BRK) offset(delta=-PRINT_SHRINK) p_svbracket_row();
else if (part=="svbracket_col_asm") sXZ(CSV_BRK) offset(delta=-PRINT_SHRINK) p_svbracket_col();

else if (part=="crank_row_asm")     a_crank_row();
else if (part=="crank_col_asm")     a_crank_col();
else if (part=="crank_latch_asm")   a_crank_latch();
else if (part=="knob")       rotate([180,0,0]) a_knob();
else if (part=="knob_asm")   a_knob();
else if (part=="pivot")      a_pivot();
