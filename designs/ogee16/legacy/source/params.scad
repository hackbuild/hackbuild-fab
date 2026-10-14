$fa = 2; $fs = 0.25;
// ===========================================================================
// OGEE R14 - every dimension, in dependency order.
//
// Same mechanism as R13. Three things are new:
//   1. The lugs are RAKED, the way they are in the Fusion screenshots. They
//      dogleg: vertical from the mortise up through the deck, then raked over
//      to the pivot. A lug raked THROUGH the deck cannot be guided by it, since
//      its crossing point walks sideways 9*tan(rake) as the bar rises, so a
//      40 degree rake would need a 23.6mm slot for a 12mm lug. Doglegged, the
//      slot stays 12.4 and the deck still holds the bars square.
//   2. Each rod carries a CAP in one of four shapes, mortised on, sitting flush
//      in a matching aperture in the upper face plate.
//   3. The rake pushes the pivots sideways by RAKE_DX, so the column bar is
//      offset by the same amount and the link, crown and rod are untouched.
// ===========================================================================

T        = 3.0;
LAM      = 2;
TB       = T*LAM;
EPS      = 0.01;
FIT_SLIP = 0.40;      // laser part sliding in a laser slot
// A LASER SLOT NOW RECEIVES A PRINTED PART, and the two err in opposite
// directions: kerf compensation lands a cut slot on its drawn size, while a
// printed feature comes out OVER its drawn size by about 0.15. So a printed 3.0
// lug in a 3.40 slot has 0.25 of real clearance, at the very bottom of a sliding
// fit, and any kerf error eats the rest. FIT_PSLIP puts it back in the middle.
PRINT_OVER = 0.15;    // how much a printed feature exceeds its drawn size
// +0.15 of extra give on top: 0.55 drawn left 0.40 real, which measured fine and
// felt tight. 0.70 leaves 0.55.
FIT_PSLIP  = FIT_SLIP + PRINT_OVER + 0.15;
FIT_LAP  = 0.15;
FIT_TEN  = 0.15;
FIT_BORE = 0.40;   // link bore over the pin: the link is the busiest joint

N        = 4;
PITCH    = 34;
function px(j) = j*PITCH;
function py(i) = i*PITCH;
C        = 9.0;   // back to 9 now that the stations are inline: the yaw was the
                  // only thing that forced the span out to 13
YOFF     = 3.4;
STROKE   = 9.0;

// ---- the rake -------------------------------------------------------------
DIAG     = 0;    // the lugs are YAWED to face along this diagonal, which is
                  // the line the link runs on. They are not tilted.                      // degrees
DC       = cos(DIAG);                      // rake starts here, clear of deck + stroke
ROD_Z    = 48;                      // pivot centres




// ---- Z stack --------------------------------------------------------------
BASE_Z   = 0;
RB_Z     = BASE_Z + T;  RB_H = TB;  // row bar 3 .. 9, resting on the base
CB_Z     = 20;  CB_H = TB;          // col bar 20 .. 26
DECK_Z   = 37;                      // deck 37 .. 40, lugs vertical from 3/20 to 50
LINK_R   = 4.5;
CROWN_R  = 11.0;  // taller, to lift the rod's foot clear of the
                  // band the raked lugs sweep through (50 to 62)
CROWN_OFF = 0.50;
CROWN_TOP = ROD_Z + CROWN_R;        // 59
ROW_SLOT_E = 2.60;

LUG_W    = 12;    // narrower, because a raked lug's horizontal
                  // extent is LUG_W/cos(rake) and it has to miss the rod
LUG_TOP  = ROD_Z + LUG_W/2;         // 68
TEN_W    = 4.0;  TEN_P = 3.5;

R_LATCH  = 7.6;
LP_Z     = 77;  LP_T = T;           // latch plate 95 .. 98
LP_SLIDE = 3.0;
Z_LUG0   = LP_Z + LP_T - R_LATCH;   // 86.4
FACE_Z   = 91;                     // lower face 105 .. 108
FACE2_Z  = FACE_Z + T;              // upper face 108 .. 111, holds the cap apertures
RAIL_Z0  = 70;  RAIL_Z1 = FACE_Z;
WALL_TOP = FACE_Z;

PIN_W    = 10.0;
LUG_P    = 1.25;
LUG_H    = 0.60;
LUG_RAMP = 1.20;
LUG_TOT  = LUG_H + LUG_RAMP;
NOTCH_W  = 4.45;
PIN_PLAY = (NOTCH_W - T)/2;
NOTCH_D  = 10.0;
RAMP_A   = 40;
PIN_BOTL = -NOTCH_D;
PIN_TOPL = FACE2_Z + T - CROWN_TOP; // rod tenon flush with the cap's top face
SLOT_X   = T + FIT_PSLIP;   // the ROD through it is printed, in both the
                            // latch plate and the lower face
SLOT_E   = 6.05;
// how far the rod cams sideways getting its lug over the plate edge. The face
// aperture and the cap pocket both have to allow for it.
CAM      = (PIN_W/2 + LUG_P + PIN_PLAY) - SLOT_E;
SLOT_B   = -9.10;
FACE_E   = 6.6;
LP_X0 = -34; LP_X1 = 140;
LP_Y0 = -34; LP_Y1 = 140;

// ---- caps -----------------------------------------------------------------
CAP_D    = 16.0;                    // across flats / diameter
// 0.35 + PRINT_OVER lands the cap at 0.50 of real clearance in its pocket. At
// 0.60 + PRINT_OVER it was 0.60, which is a visible rattle on the one part of
// this machine you actually look at.
CAP_FIT  = 0.50 + PRINT_OVER;       // aperture clearance in the upper face,
                                    // and the CAP in it is printed
CAP_SHAPES = ["circle","square","hex","triangle"];

// ---- pivots ---------------------------------------------------------------
ROD_D    = 3.0;
LUG_BORE = ROD_D - 0.10;
LINK_BORE = ROD_D + FIT_BORE;
WASH_D   = 8.0;
PIV_LEN  = 11.0;

// ---- bars -----------------------------------------------------------------
RBW      = 12;
CBW      = 12;
ROWLUG_U = C;  COLLUG_U = -C;       // cell-local, +u along the diagonal
// General for any DIAG. At 0 these are just YOFF and -C; at 45 they are
// (C+YOFF)*cos45 and -(C-YOFF)*cos45.
ROW_BAR_Y =  C*sin(DIAG) + YOFF*cos(DIAG);
COL_BAR_X = -C*cos(DIAG) + YOFF*sin(DIAG);
BAR_X0   = -32; BAR_X1 = 130;
BAR_Y0   = -32; BAR_Y1 = 130;
// Two guides per bar. The drive lug is 16 wide for its yoke and so needs a
// loose deck slot; the guides are what actually square the bars.
// One guide lug per bar, at the far end from the drive lug. The drive lug's
// deck slot is 16.4 for a 16 wide lug, which is the same 0.4 clearance as a
// tight slot, so it guides too: two tight stations per bar is enough for x, y
// and yaw. A second guide had nowhere to go that was clear of the row bars,
// the column lugs AND the links.
GUIDE_X  = [-30];
GUIDE_Y  = [-30, 51];   // the column drive lug's deck slot is swallowed by the
                        // crank cutout, so the columns need a second guide
DRIVE_X  = 126;
DRIVE_Y  = 126;


// ---- servos ---------------------------------------------------------------
SV_L = 22.8; SV_W = 12.2; SV_H = 22.5;
SV_TAB_SPAN = 32.2; SV_HOLE_P = 27.8; SV_HOLE_D = 2.2;
SV_FLANGE_T = 2.5;
SV_T_BRK0 = 15.9; SV_T_BRK1 = SV_T_BRK0 + SV_FLANGE_T;
SV_T_CRK0 = 24.5; SV_T_CRK1 = SV_T_CRK0 + T;
SV_SHAFT_OFF = 5.5; SV_SHAFT_TOP = 28.5; SV_SPLINE_D = 4.8;
SV_FIT = 0.5;

CRANK_R  = 6.0;
CRANK_SW = asin(STROKE/(2*CRANK_R));
CRANK_HUB = 11.0;
CRANK_BORE = ROD_D + FIT_BORE;

RSV_Z    = 27.5;  // the crank plane sits over its own bar's centreline, so its
                  // lowest point has to clear that bar at FULL STROKE, not at rest
CSV_Z    = 48.5;  // was 44.5, which put the servo FLANGE at z 38.4 and clipped
                  // the deck by 1.6 at its corners: the flange is 32.2 long
                  // against a 25 wide deck cutout. Lifting the shaft 3mm clears
                  // it outright. At 47.5 the flange still sat only 1.40 above the deck,
                  // which reads as touching; 48.5 gives 2.40 and the crank still
                  // has 5.04 to the driven bar  // ditto, and this one has to cross the deck to do it
RSV_CRK  = 129.5;
CSV_CRK  = 129.5;
RSV_BRK  = 135.6;
CSV_BRK  = 135.6;

// ---- box ------------------------------------------------------------------
XI0 = -36; XI1 = 160;
YI0 = -36; YI1 = 160;
BX0 = XI0 - T; BX1 = XI1 + T;
BY0 = YI0 - T; BY1 = YI1 + T;
TAB_W = 10;
RAIL_X0 = -33; RAIL_X1 = 136;

// ---- latch drive. Moved off the corner: the raked lugs push the column bars
// CX_OFF to -X and the old corner ribs would sit inside column bar 0.
// The latch servo lives in the CORNER between row servo 3 and column servo 3,
// which is the one genuinely empty pocket at plate-drive height: x 104..134,
// y 118..131, z 41..70, and still over the plate so the crank can reach it.
// It used to sit alone in the middle of the -Y edge on a 57mm tower.
// x 124 is the only window: the printed servo BODY must clear column servo 3
// (which ends at x 104.4) so LSV_X > 123.3, and the LASER crank plus its keeper
// washer must clear the +X rail at 136 so LSV_X < 125.
LSV_X = 124; LSV_Y = 120;
LTAB_Y = -20;             // the HAND pull tab stays on the -Y corner where a
                          // hand can reach it: it has nothing to do with where
                          // the servo went   // far enough in that the servo's FLANGE clears the
                          // wall, not just its body: the flange is 32.2 long
                          // against a 22.8 body and it is what gets screwed down   // in the gap between column bars 0 and 1
LCRANK_R = 6.0;
LCRANK_SW = asin(LP_SLIDE/(2*LCRANK_R));
LSV_SHAFT_Z = LP_Z - 2.0 - T;
LSV_T0 = LSV_SHAFT_Z - SV_T_CRK0;
LSV_BRK_Z = LSV_T0 + SV_T_BRK0;
LRIB_X = [110, 122];   // laser tower ribs, clear of row 3's drive lug at 124.5
                       // and of column bar 3
LRIB_Y0 = 111; LRIB_Y1 = 130;
CKP_LEN = 12.0;
CKP_LEN_L = 14.0;
