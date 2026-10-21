// ============================================================================
// SLUG  -  lasercut capsule vending machine   |   hack.build
// 2 inch (50.8 mm) capsules, coin acceptor, 28BYJ-48 + ULN2003
// ----------------------------------------------------------------------------
// Every structural part is flat. No printed parts, no bearings, no bushings.
// Stock: 6 mm birch ply (structure), 3 mm acrylic (window, door, washers)
//
//   openscad -o slug.stl    -D 'MODE="asm"'                          slug.scad
//   openscad -o s1.svg      -D 'MODE="sheet"' -D SHEET=1              slug.scad
//   openscad -o rotor.svg   -D 'MODE="part"' -D 'PART="rotor_gear_b"' slug.scad
//
// KERF: outlines are NOMINAL. Cut with kerf compensation OFF. Parts come out
// about 0.15 mm small, which is the gear backlash and the slip fit this
// design wants. Do not "correct" it.
// ============================================================================

MODE  = "asm";
SHEET = 1;
PART  = "rotor_gear_b";
$fn   = 72;

// ---------------------------------------------------------------- material
t    = 3.0;      // ply thickness            MEASURE YOUR STOCK, IT IS NOT 3.00
ta   = 3.0;      // acrylic
slop = 0.15;     // slot widening per side

// ---------------------------------------------------------------- capsule
cap_d   = 50.8;
pock_d  = 62.0;      // 5.6 mm of slop per side, or capsules perch on the pocket rim
pock_rc = 47.5;
npock   = 4;

// ---------------------------------------------------------------- gear train
gm     = 2.5;
gz_rot = 76;      // PD 190  OD 195  root r 91.875
gz_pin = 19;      // PD 47.5 OD 52.5
gpa    = 20;
CD     = gm*(gz_rot+gz_pin)/2;         // 106.25
RATIO  = gz_rot/gz_pin;                // exactly 4.0
rot_od = gm*(gz_rot+2);
// The drum is 54 mm tall because it is a capsule WELL, not because the gear needs
// it. At 3 mm stock a solid stack would be eighteen 195 mm discs, nearly three
// sheets. It is a cage instead: a toothed pair at the bottom, one ring at the
// capsule equator, a top disc, and eight posts holding them apart. The equator
// ring is what actually locates the capsule, so the height costs almost nothing.
rot_h      = 54;
rot_gear_n = 2;              // toothed discs, laminated, 6 mm of gear face
rot_ring_z = 19;             // equator ring sits local 19..19+t, capsule equator 20.8
rot_top_z  = rot_h - t;
rot_ring_r = 85;             // the equator ring only has to reach past the pockets
// Spacers live in the OUTER RIM, not the web between pockets. That web is only
// 5.2 mm wide at its waist, so a radial slot through it left under 1 mm of ply.
// The rim runs 78.5 to 91.875 all the way round: 13.4 mm of continuous material.
// Spacers sit tangentially there, one per 45 degrees.
// They are per-gap, so each one seats on the disc below and the next disc seats on
// it. No stepped tenons and nothing to thread: the tenon is just a locating tab in
// a plain slot, glued.
// The two tiers are staggered by half a pitch. Stacked on the same angle both
// tenons wanted the same slot in the equator ring, which is 3.3 mm wide and holds
// one. Tier A sits at i*60, tier B at i*60+30.
spc_r    = 85;    // spacer pitch circle, in the rim
spc_n    = 6;     // per tier
spc_w    = 18;    // tenon width, and the slot width
spc_body = 24;    // shoulder width, 3 mm of bearing either side
spc_gap1 = rot_ring_z - rot_gear_n*t;              // toothed pair up to the ring
spc_gap2 = rot_top_z - (rot_ring_z + t);           // ring up to the top disc
rot_bore = 8.4;                        // rides straight on an M8 axle
tie_r  = 11; tie_r2 = 52; tie_d = 4.5;   // 45 deg, between the pockets AND between
                                        // the post tenons, which sit at r 30 and 70

// ---------------------------------------------------------------- envelope
XL=-152; XR=105; YB=-105; YF=105;
WI = XR-XL; DI = YF-YB;

// everything below derives from t, so 3 mm stock does not need hand arithmetic
z_base   = 0;                    // base plate, laminated pair
z_deckA  = 300;                  // deck lower
z_deckB  = z_deckA + t;          // deck upper
z_mplate = z_deckB + t;          // motor plate, laminated pair, ears on top
z_wash   = z_mplate;             // acrylic thrust washer + a 1.6 steel washer
z_rot    = z_wash + ta + 1.6;    // drum bottom
z_pin    = z_rot;                // pinion spans the toothed pair exactly
z_ceil   = z_rot + rot_h + 1.9;  // 1.9 mm over the drum: the moving face has to
z_funtop = 515;                  //   reach the mouth or capsules arch in it
z_top    = 690;
z_split  = z_mplate;             // lower / upper panel seam
z_stiff  = 530;                  // hopper stiffener, braces all four upper panels

thr   = [0,0];           // throat, centred on the axle. The pockets meter, not the throat
exi   = [0, pock_rc];    // exit, front
thr_d = 62; exi_d = 66;   // thr_d is now only a reference; see throat2d()
mot   = [-CD, 0];
mot_body_off = -8;       // 28BYJ-48 body centre sits 8 mm off the shaft axis
mot_ear_dy   = 17.5;     // ears 35 mm apart, perpendicular to that offset
fb    = 78;              // half of the funnel mouth. The THROAT IS THIS SAME SHAPE,
thr_cr= 38;              // so a capsule never perches on a ledge. 156 mm is 3.07 capsule
                         // diameters, and spheres cannot arch across more than 2.
q_tab = 3;               // how far a funnel foot reaches down its own slope
f_lap = 6;               // left/right funnel panels lap back off the front panel
y_fback = -78;           // INNER FACE of the vertical back face, at thr[1]-fb

// ---------------------------------------------------------------- coin acceptor
// JY-133A class, drop-insert comparable selector with the yellow faceplate and
// flip cover. Faceplate and bolt spacing were measured off the product photos and
// cross checked against the published 65 x 123 mm front size for this family:
//   faceplate 67 x 123, corner bolts 51.5 x 103, edge margin 7.8
// The 4 supplied long bolts pass through the faceplate corners and the panel and
// take nuts inside. CUT slug gauge AND TEST FIT BEFORE CUTTING THE PANEL.
ca_pos    = [-95, 200];   // left of the delivery door, which the reject cup would foul   // centre of the acceptor on the front panel (x,z)
ca_face_w = 67;  ca_face_h = 123;   // the yellow faceplate, sits OUTSIDE the panel
ca_win_w  = 60;  ca_win_h  = 112;   // hole in the FRONT PANEL, generous, adapter covers it
ca_plate_w= 99;  ca_plate_h= 155;   // adapter plate, the only acceptor specific part
ca_mnt_x  = 85;  ca_mnt_z  = 141;   // adapter plate to front panel, M4
ca_body_w = 40;  ca_body_h = 98;    // mech body passes through the adapter    MEASURE
ca_bolt_x = 51.5; ca_bolt_z = 103;  // acceptor's own bolts, cut as SLOTS      MEASURE
ca_slot   = 12;  ca_bolt_d = 4.6;

// ---------------------------------------------------------------- coin handling
// Accepted coins fall out of the acceptor onto a sloped chute and into a cash box
// in the left compartment. Rejects drop into a return cup behind a front opening.
cwx     = -59;                 // coin wall, material cwx .. cwx+t, butted to the left rail
cw_z1   = 140;                 // stops below the acceptor body, which sits at 147
chute_a = [-20, 76];           // (y,z) low end, 10 mm clear over the drawer mouth
chute_b = [80,143];            // (y,z) high end, clear under the acceptor body
chute_w = 87; chute_cx = -105.5;
chute_len = sqrt(pow(chute_b[0]-chute_a[0],2)+pow(chute_b[1]-chute_a[1],2));
chute_ang = atan2(chute_b[1]-chute_a[1], chute_b[0]-chute_a[0]);
cash    = [84,106,60];          // cash box, x y z. It is a DRAWER: it pulls out
                               // through the back panel, so its own face is the lid
cash_c  = [-106,-58];          // its rear face is flush with the panel outside
elec_c  = [ 45, -66];          // ESP32 + ULN2003 + buck, flat on the base behind
                               // the ramp, right of the coin wall
// This acceptor returns rejected coins out of the bottom of its own faceplate, on
// the OUTSIDE of the panel. The cup therefore hangs off the front, and the front
// panel gets no return opening at all.
ret_w   = 60; ret_d = 34; ret_z0 = 90; ret_z1 = 118;
ret_mnt = 44;                 // cup to panel bolts
hatch   = [88,72]; hatch_c = [-106,42];   // rear opening the drawer slides through
face    = [92,84];                        // the drawer face, proud of the panel

// ---------------------------------------------------------------- delivery
door_w = 100; door_z0 = 30; door_z1 = 100;
ramp_w = 94;
ramp_a = [-20,120];      // (y,z) high end, under the exit
ramp_b = [ 95, 35];      // (y,z) low end at the front panel
ramp_len = sqrt(pow(ramp_b[0]-ramp_a[0],2)+pow(ramp_b[1]-ramp_a[1],2));
ramp_ang = atan2(ramp_b[1]-ramp_a[1], ramp_b[0]-ramp_a[0]);

ftab_lo = [56,156,256];
ftab_hi = [356,456,556,650];

// ============================================================================
// helpers
// ============================================================================
function tabc(a,b,n) = [for(i=[0:n-1]) a+(b-a)*(i+0.5)/n];

module tab_row_h(a,b,n,w,dir,fixed) {
    for (c=tabc(a,b,n)) translate([c-w/2, dir<0 ? fixed-t : fixed]) square([w,t]);
}
module tab_row_v(a,b,n,w,dir,fixed) {
    for (c=tabc(a,b,n)) translate([dir<0 ? fixed-t : fixed, c-w/2]) square([t,w]);
}
module slot_row_h(a,b,n,w,fixed) {
    for (c=tabc(a,b,n)) translate([c-w/2-slop, fixed-slop]) square([w+2*slop, t+2*slop]);
}
module tslot(depth=18, bd=4.4, af=7.3, nt=3.4, at=11) {
    translate([-bd/2,-1]) square([bd, depth+1]);
    translate([-af/2, at]) square([af, nt]);
}

// ---------------------------------------------------------------- involute gear
function inv_a(br,r) = (r<=br) ? 0 : (tan(acos(br/r))*180/PI - acos(br/r));
module gear2d(m,z,pa=20,steps=10) {
    pr=m*z/2; br=pr*cos(pa); ar=pr+m; rr=pr-1.25*m;
    half = 90/z + inv_a(br,pr);
    base = max(rr,br);
    fl = [for(i=[0:steps]) let(r=base+(ar-base)*i/steps, a=half-inv_a(br,r)) [r*cos(a),r*sin(a)]];
    hr = half - inv_a(br,base);
    tooth = concat([[0,0],[rr*cos(-hr),rr*sin(-hr)]],
                   [for(i=[0:steps]) [fl[i][0],-fl[i][1]]],
                   [for(i=[steps:-1:0]) fl[i]],
                   [[rr*cos(hr),rr*sin(hr)]]);
    union() {
        circle(r=rr);                       // root disc welds every tooth together
        for (i=[0:z-1]) rotate(i*360/z) polygon(tooth);
    }
}

// ============================================================================
// ROTATING PARTS
// ============================================================================
module rotor_mortise(w, off=0) {
    for (i=[0:spc_n-1]) rotate(off+i*360/spc_n) translate([spc_r,0])
        square([t+2*slop, w+2*slop], center=true);   // tangential, not radial
}
module rotor_common(mw=0, off=0, both=false) {
    circle(d=rot_bore);
    for (i=[0:npock-1]) rotate(i*360/npock) translate([pock_rc,0]) circle(d=pock_d);
    for (i=[0:3]) rotate(45+i*90) { translate([tie_r,0]) circle(d=tie_d);
                                    translate([tie_r2,0]) circle(d=tie_d); }
    if (mw>0) { rotor_mortise(mw, off);
               if (both) rotor_mortise(mw, off+180/spc_n); }
}
module rotor_gear(mw=spc_w) { difference() { gear2d(gm,gz_rot); rotor_common(mw,0); } }
// the ring takes both tiers, so it carries twice the slots
module rotor_ring() { difference() { circle(r=gm*gz_rot/2-1.25*gm); rotor_common(spc_w,0,true); } }
module rotor_top()  { difference() { circle(r=gm*gz_rot/2-1.25*gm); rotor_common(spc_w,180/spc_n); } }

// one spacer per gap: tenon, shoulder, tenon. Nothing to thread past.
module spacer(gap) {
    union() {
        translate([-spc_body/2, t]) square([spc_body, gap]);
        for (s=[0,1]) translate([-spc_w/2, s*(gap+t)]) square([spc_w, t]);
    }
}
module spacer_a() { spacer(spc_gap1); }
module spacer_b() { spacer(spc_gap2); }
module pinion() {
    difference() {
        gear2d(gm,gz_pin,gpa);
        intersection() { circle(d=5.1); translate([-10,-10]) square([18.15,20]); }
        for (i=[0:2]) rotate(i*120+30) translate([14,0]) circle(d=2.6);
    }
}
module thrust_washer() { difference() { circle(d=34); circle(d=8.6); } }

// ============================================================================
// HORIZONTAL PLATES
// ============================================================================
module plate_blank(tw=30) {
    translate([XL,YB]) square([WI,DI]);
    tab_row_v(YB,YF,3,tw,-1,XL);
    tab_row_v(YB,YF,3,tw, 1,XR);
    tab_row_h(XL,XR,3,tw,-1,YB);
    tab_row_h(XL,XR,3,tw, 1,YF);
}
module plate_bolts() {
    for (yy=[-32,32]) {
        translate([XL,yy]) rotate(-90) tslot();
        translate([XR,yy]) rotate( 90) tslot();
    }
}
module base_plate() {
    difference() {
        plate_blank(); plate_bolts();
        for (s=[-1,1]) for (dy=[-38,38])
            translate([s*(ramp_w/2+t/2)-t/2-slop, (ramp_a[0]+ramp_b[0])/2+dy-12-slop]) square([t+2*slop,24+2*slop]);
        translate([-80,-80]) circle(d=16);
        for (c=tabc(YB,YF,4)) translate([cwx-slop, c-15-slop]) square([t+2*slop, 30+2*slop]);
        translate([elec_c[0]-45, elec_c[1]-37])
            for (x=[10:20:80]) for (y=[10:18:64]) translate([x,y]) circle(d=3.2);
        for (dx=[52,88]) for (dy=[-84,-22]) translate([dx,dy]) circle(d=3.2);
    }
}
module deck_common() {
    translate(exi) circle(d=exi_d);
    circle(d=8.6);
    translate([mot[0]+mot_body_off, mot[1]]) circle(d=30);
    for (dx=[-10,6]) for (dy=[-30,30]) translate([mot[0]+dx,mot[1]+dy]) circle(d=4.4);
    translate([-80,-80]) circle(d=16);
    for (a=[0:5]) rotate(a*60) translate([88,0]) circle(d=4.4);  // COUNTERSINK, flush
}
module deck_lower() { difference() { plate_blank(); plate_bolts(); deck_common(); } }
module deck_upper() { difference() { plate_blank(); plate_bolts(); deck_common(); } }
// The throat is the funnel mouth itself, not a circle inside it. A round hole
// under a square mouth leaves a ledge, and a capsule parks on the ledge forever.
// The mouth is wide so capsules cannot arch. The HOOD is the part of the ceiling
// that stays over the exit quadrant, so a pocket sitting on the exit cannot be
// refilled from above and hand out the whole hopper for one coin.
hood_a0 = 0; hood_a1 = 180; hood_r = 100;
module hood2d() {
    polygon(concat([[0,0]], [for (a=[hood_a0:5:hood_a1]) [hood_r*cos(a), hood_r*sin(a)]]));
}
module throat2d() {
    difference() {
        offset(r=thr_cr) square([2*(fb-thr_cr),2*(fb-thr_cr)],center=true);
        hood2d();
    }
}
module ceiling_plate() {
    difference() {
        plate_blank(); plate_bolts();
        translate(thr) throat2d();
        circle(d=16);            // the axle passes through the hood
        funnel_ceiling_slots();
    }
}
// 3 mm panels bow over the 320 mm upper span. The funnel heads brace the front and
// both sides at mid height; this braces all four and gives the hopper a lip.
module stiffener() {
    difference() { plate_blank(); plate_bolts();
        translate([XL+26, YB+26]) square([WI-52, DI-52]); }
}
module roof_plate() { difference() { plate_blank(); plate_bolts(); circle(d=40); } }

// ============================================================================
// VERTICAL PANELS
// ============================================================================
// vertical panels carry ABSOLUTE machine z as their local y
module side_common(z0,z1) {
    for (p=[z_base,z_deckA,z_deckB,z_ceil,z_top]) if (p>=z0-0.5 && p<z1-0.5) {
        translate([0,p]) slot_row_h(YB,YF,3,30,0);
        for (yy=[-32,32]) translate([yy, p+t/2]) circle(d=4.4);
    }
    for (zz=concat(ftab_lo,ftab_hi)) if (zz>z0+12 && zz<z1-12)
        for (yy=[YB,YF]) translate([yy+(yy>0?-slop:-t-slop), zz-20-slop]) square([t+2*slop,40+2*slop]);
    if (z1<=z_split+1) for (dy=[-64,-24,24,64]) translate([dy, z_split-18]) circle(d=4.4);
    else               for (dy=[-64,-24,24,64]) translate([dy, z_split+18]) circle(d=4.4);
}
module side_lower(sd=-1) {          // sd = -1 left wall, +1 right wall
    difference() {
        translate([YB-t,0]) square([DI+2*t, z_split]);
        side_common(0,z_split);
        if (sd<0) chute_slots();        // only the left wall carries the coin chute
    }
}
module side_upper(sd=-1) {          // sd = -1 left wall, +1 right wall
    p = (sd<0) ? 2 : 3;
    difference() {
        translate([YB-t,z_split]) square([DI+2*t, z_top+t-z_split]);
        side_common(z_split,z_top+t);
        translate([-30, z_top-46]) square([60,18]);
        for (i=[0,1]) {
            yy = (sd<0) ? thr[1]+fun_head(p,i) : thr[1]-fun_head(p,i);
            translate([yy-head_w/2-slop, head_z(p)-head_h(p)/2-slop])
                square([head_w+2*slop, head_h(p)+2*slop]);
        }
        for (zz=fback_z) translate([y_fback-t-slop, zz-15-slop]) square([t+2*slop, 30+2*slop]);
    }
}
module splice() {
    difference() {
        translate([-80,-56]) square([160,112]);
        for (dy=[-64,-24,24,64]) for (dz=[-18,18]) translate([dy,dz]) circle(d=4.4);
    }
}
module vpanel_blank(z0,z1,tabs) {
    translate([XL,z0]) square([WI,z1-z0]);
    for (zz=tabs) { translate([XL-t,zz-20]) square([t,40]); translate([XR,zz-20]) square([t,40]); }
}
module vpanel_slots(z0,z1) {
    for (p=[z_base,z_deckA,z_deckB,z_ceil,z_top]) if (p>=z0-0.5 && p<z1-0.5)
        translate([0,p]) slot_row_h(XL,XR,3,30,0);
}
module front_lower() {
    difference() {
        vpanel_blank(0,z_split,ftab_lo); vpanel_slots(0,z_split);
        translate([-door_w/2,door_z0]) square([door_w,door_z1-door_z0]);
        for (s=[-1,1]) for (dz=[0,16]) translate([s*(door_w/2+10), door_z1+14+dz]) circle(d=3.4);
        translate([ca_pos[0]-ca_win_w/2, ca_pos[1]-ca_win_h/2]) square([ca_win_w,ca_win_h]);
        for (sx=[-1,1]) translate([ca_pos[0]+sx*ret_mnt/2, ret_z1-6]) circle(d=4.4);
        for (zz=[30,75]) translate([cwx-slop, zz-15-slop]) square([t+2*slop, 30+2*slop]);
        for (sx=[-1,1]) for (sz=[-1,1])
            translate([ca_pos[0]+sx*ca_mnt_x/2, ca_pos[1]+sz*ca_mnt_z/2]) circle(d=4.4);
    }
}
// the ONLY part carrying acceptor specific holes. Cut it last, after the gauge fits.
module coin_plate() {
    difference() {
        translate([-ca_plate_w/2,-ca_plate_h/2]) square([ca_plate_w,ca_plate_h]);
        translate([-ca_body_w/2,-ca_body_h/2]) square([ca_body_w,ca_body_h]);
        for (sx=[-1,1]) for (sz=[-1,1]) translate([sx*ca_bolt_x/2, sz*ca_bolt_z/2])
            hull() for (dz=[-ca_slot/2,ca_slot/2]) translate([0,dz]) circle(d=ca_bolt_d);
        for (sx=[-1,1]) for (sz=[-1,1]) translate([sx*ca_mnt_x/2, sz*ca_mnt_z/2]) circle(d=4.4);
    }
}
module back_lower() {
    difference() {
        vpanel_blank(0,z_split,ftab_lo); vpanel_slots(0,z_split);
        translate([-45,150]) square([90,70]);
        translate([hatch_c[0]-hatch[0]/2, hatch_c[1]-hatch[1]/2]) square(hatch);
        translate([hatch_c[0], hatch_c[1]+face[1]/2+4]) circle(d=4.4);   // turnbutton pivot
        for (zz=[30,75]) translate([cwx-slop, zz-15-slop]) square([t+2*slop, 30+2*slop]);
        for (dx=[-40,40]) for (dz=[60,110]) translate([dx,dz]) circle(d=4.4);
    }
}
module front_upper() {
    difference() {
        vpanel_blank(z_split,z_top+t,ftab_hi);
        vpanel_slots(z_split,z_top+t);
        translate([XL+24, z_funtop+22]) square([WI-48, z_top-z_funtop-62]);
        for (dx=[XL+13,XR-13]) for (dz=[z_funtop+28,(z_funtop+z_top)/2,z_top-58]) translate([dx,dz]) circle(d=3.4);
        for (i=[0,1]) translate([fun_head(0,i)-head_w/2-slop, head_z(0)-head_h(0)/2-slop])
            square([head_w+2*slop, head_h(0)+2*slop]);
    }
}
module back_upper() {
    difference() {
        vpanel_blank(z_split,z_top+t,ftab_hi);
        vpanel_slots(z_split,z_top+t);
        translate([XL+44, z_funtop+22]) square([WI-88, z_top-z_funtop-62]);
    }
}
module window_acrylic() { square([WI-48+22, z_top-z_funtop-62+22]); }

// ============================================================================
// FUNNEL
// ----------------------------------------------------------------------------
// The throat is not centred in the box, so no two faces are alike. The BACK face
// is vertical (its run would only have been 19 mm) which makes it a plain
// tabbed panel. The other three lean, and every joint they make has to account
// for a plate crossing a plate at something other than 90 degrees.
// ============================================================================
fun_sides = [0,2,3];        // 0 front, 2 left, 3 right
function fun_run(p)  = (p==0) ? YF-(thr[1]+fb) : (p==2) ? (thr[0]-fb)-XL : XR-(thr[0]+fb);
function fun_dz()    = z_funtop-(z_ceil+t);
function fun_ang(p)  = atan2(fun_dz(), fun_run(p));
// A panel's INNER face is the funnel wall, not its mid plane. Offsetting the mid
// plane outboard by (t/2)/sin(ang) is the difference between a 58 mm mouth and a
// 49.9 mm one, and the capsule is 50.8.
function fun_R0(p)   = fb + (t/2)/sin(fun_ang(p));
function fun_uw(p)   = (fun_run(p) - (t/2)/sin(fun_ang(p)))/cos(fun_ang(p));
function fun_s(p)    = fun_uw(p) - (t/2)*tan(fun_ang(p));   // outer face lands on the wall
function fun_frac(p) = fun_s(p)/fun_uw(p);
function fun_rz(p)   = (p==0)?0:(p==2)?90:270;

function fun_bL(p) = (p==0)? -fb : (p==2)? -fb        : -fb+f_lap;
function fun_bR(p) = (p==0)?  fb : (p==2)? fb-f_lap   :  fb;
function fun_TL(p) = (p==0)? XL-thr[0] : (p==2)? -fb  : -(YF-thr[1])+f_lap;
function fun_TR(p) = (p==0)? XR-thr[0] : (p==2)? (YF-thr[1])-f_lap : fb;
function fun_tL(p) = fun_bL(p) + (fun_TL(p)-fun_bL(p))*fun_frac(p);
function fun_tR(p) = fun_bR(p) + (fun_TR(p)-fun_bR(p))*fun_frac(p);

function fun_foot(p,i) = fun_bL(p) + (fun_bR(p)-fun_bL(p))*(i?0.75:0.25);
function fun_head(p,i) = fun_tL(p) + (fun_tR(p)-fun_tL(p))*(i?0.70:0.30);
foot_w = 16; head_w = 26;

// a foot leans as it descends, so its slot is a radial BAND, not a line
function foot_in(p)  = fun_R0(p) - q_tab*cos(fun_ang(p)) - (t/2)*sin(fun_ang(p));
function foot_out(p) = fun_R0(p) + (t/2)*sin(fun_ang(p));
// a head tab crossing a vertical wall sweeps vertically by the same argument
function head_h(p)   = t*tan(fun_ang(p)) + t/cos(fun_ang(p));
function head_z(p)   = z_ceil+t + ((fun_run(p) + t/2 - (t/2)/sin(fun_ang(p)))/cos(fun_ang(p)))*sin(fun_ang(p));
function head_len(p) = t/cos(fun_ang(p)) + 3;

module funnel_panel(p) {
    s=fun_s(p);
    difference() {
        union() {
            polygon([[fun_bL(p),0],[fun_bR(p),0],[fun_tR(p),s],[fun_tL(p),s]]);
            for (i=[0,1]) translate([fun_foot(p,i)-foot_w/2,-q_tab]) square([foot_w,q_tab]);
            for (i=[0,1]) translate([fun_head(p,i)-head_w/2,s])      square([head_w,head_len(p)]);
        }
        for (i=[1:floor(s/70)]) translate([(fun_bL(p)+fun_bR(p))/2, s*i/(floor(s/70)+1)]) circle(d=20);
    }
}
// the vertical back face: plain 90 degree joinery, tabs into the ceiling and both sides
fback_x = [-120,-60,0,60];
fback_z = [410,465];
module funnel_back() {
    union() {
        translate([XL, z_ceil+t]) square([WI, z_funtop-(z_ceil+t)]);
        for (c=fback_x) translate([c-12, z_ceil]) square([24,t]);
        for (zz=fback_z) { translate([XL-t,zz-15]) square([t,30]); translate([XR,zz-15]) square([t,30]); }
    }
}
module funnel_ceiling_slots() {
    for (p=fun_sides) translate(thr) rotate(fun_rz(p))
        for (i=[0,1]) translate([fun_foot(p,i)-foot_w/2-slop, foot_in(p)-slop])
            square([foot_w+2*slop, foot_out(p)-foot_in(p)+2*slop]);
    for (c=fback_x) translate([c-12-slop, y_fback-t-slop]) square([24+2*slop, t+2*slop]);
}
module funnel3d() {
    for (p=fun_sides)
        translate([thr[0],thr[1],z_ceil+t]) rotate([0,0,fun_rz(p)]) translate([0,fun_R0(p),0])
            rotate([fun_ang(p),0,0]) translate([0,0,-t/2]) ex(t) funnel_panel(p);
    xz(y_fback) ex(t) funnel_back();
}

// ============================================================================
// COIN PATH
// ============================================================================
module chute_slots() {                       // in a vertical yz plate
    for (u=[0.25,0.5,0.75]) {
        py = chute_a[0]+(chute_b[0]-chute_a[0])*u;
        pz = chute_a[1]+(chute_b[1]-chute_a[1])*u;
        translate([py,pz]) rotate(chute_ang) translate([-13-slop,-t/2-slop])
            square([26+2*slop, t+2*slop]);
    }
}
module coin_wall() {
    difference() {
        union() {
            translate([YB,z_base+t]) square([DI, cw_z1-(z_base+t)]);
            for (c=tabc(YB,YF,4)) translate([c-15, z_base]) square([30,t]);
            for (zz=[30,75]) { translate([YB-t,zz-15]) square([t,30]); translate([YF,zz-15]) square([t,30]); }
        }
        chute_slots();
        translate([-30,40]) square([60,50]);        // reach through to the cash box
    }
}
module coin_chute() {
    union() {
        translate([-chute_w/2,-chute_len/2]) square([chute_w,chute_len]);
        for (u=[0.25,0.5,0.75]) {
            c = -chute_len/2 + chute_len*u;
            translate([ chute_w/2, c-13]) square([t,26]);
            translate([-chute_w/2-t, c-13]) square([t,26]);
        }
    }
}
// external reject cup: floor, two sides and a front lip, bolted to the panel face
module ret_floor() {
    union() { square([ret_w, ret_d]);
              for (sx=[0,1]) translate([sx*(ret_w-t)-0, 0]) square([t, ret_d]); }
}
module ret_side() {
    polygon([[0,0],[ret_d,0],[ret_d, ret_z1-ret_z0-10],[0, ret_z1-ret_z0]]);
}
module ret_lip() { square([ret_w, ret_z1-ret_z0-10]); }
module ret_back() {
    difference() { square([ret_w+20, ret_z1-ret_z0]);
        for (sx=[-1,1]) translate([(ret_w+20)/2+sx*ret_mnt/2, ret_z1-ret_z0-6]) circle(d=4.4); }
}

// ============================================================================
// CHUTE / TRAY / MISC
// ============================================================================
module ramp_panel() {
    difference() {
        union() {
            translate([-ramp_w/2,-ramp_len/2]) square([ramp_w,ramp_len]);
            for (c=[-ramp_len/4, 0, ramp_len/4]) {
                translate([ ramp_w/2, c-13]) square([t,26]);
                translate([-ramp_w/2-t, c-13]) square([t,26]);
            }
        }
        for (i=[-1,0,1]) translate([0,i*ramp_len/3.4]) circle(d=24);
    }
}
module ramp_rail() {
    difference() {
        union() {
            polygon([[ramp_a[0]-8, t],[ramp_b[0], t],[ramp_b[0], ramp_b[1]+30],[ramp_a[0]-8, ramp_a[1]+30]]);
            for (dy=[-38,38]) translate([(ramp_a[0]+ramp_b[0])/2+dy-12, 0]) square([24,t]);
        }
        for (u=[0.25,0.5,0.75]) {
            px = ramp_a[0]+(ramp_b[0]-ramp_a[0])*u;
            pz = ramp_a[1]+(ramp_b[1]-ramp_a[1])*u;
            translate([px,pz]) rotate(ramp_ang) translate([-13-slop,-t/2-slop]) square([26+2*slop,t+2*slop]);
        }
    }
}
module door_flap() {
    difference() {
        translate([-(door_w+22)/2,0]) square([door_w+22, door_z1-door_z0+22]);
        for (s=[-1,1]) translate([s*(door_w/2+10), door_z1-door_z0+14]) circle(d=3.2);
    }
}
module motor_plate() {         // local origin = the motor shaft axis
    difference() {
        translate([-28,-38]) square([40,76]);
        translate([mot_body_off,0]) circle(d=29);
        for (s=[-1,1]) translate([0,s*mot_ear_dy]) circle(d=4.4);
        for (dx=[-10,6]) for (dy=[-30,30]) translate([dx,dy]) circle(d=4.4);
    }
}
ct=cash;   // the cash box
module tray_side()  { difference() { square([ct[1],ct[2]]); for (c=tabc(0,ct[1],2)) translate([c-10,-t]) square([20,t]); } }
module tray_end()   { difference() { square([ct[0],ct[2]]); for (c=tabc(0,ct[0],2)) translate([c-10,-t]) square([20,t]); } }
module tray_floor() {
    difference() { square([ct[0],ct[1]]);
        for (c=tabc(0,ct[0],2)) { translate([c-10-slop,-slop]) square([20+2*slop,t+2*slop]);
                                  translate([c-10-slop,ct[1]-t-slop]) square([20+2*slop,t+2*slop]); }
        for (c=tabc(0,ct[1],2)) { translate([-slop,c-10-slop]) square([t+2*slop,20+2*slop]);
                                  translate([ct[0]-t-slop,c-10-slop]) square([t+2*slop,20+2*slop]); } }
}
module cash_face() {                       // glues to the drawer's outer end
    difference() {
        translate([-face[0]/2,-face[1]/2]) square(face);
        translate([0,-face[1]/2+11]) square([40,8], center=true);   // finger pull
    }
}
module turnbutton() {                      // two of these hold the drawer shut
    difference() {
        hull() { circle(d=16); translate([26,0]) circle(d=11); }
        circle(d=4.4);
    }
}
module elec_plate() {
    difference() { square([90,74]); for (x=[10:10:80]) for (y=[10:10:64]) translate([x,y]) circle(d=3.2); }
}
module gauge() {
    difference() {
        square([ca_plate_w+16, ca_plate_h+16], center=true);
        translate([-ca_body_w/2,-ca_body_h/2]) square([ca_body_w,ca_body_h]);
        for (sx=[-1,1]) for (sz=[-1,1]) translate([sx*ca_bolt_x/2, sz*ca_bolt_z/2])
            hull() for (dz=[-ca_slot/2,ca_slot/2]) translate([0,dz]) circle(d=ca_bolt_d);
        translate([-ca_face_w/2, ca_plate_h/2-2]) square([ca_face_w, 4]);   // faceplate width gauge
        translate([ca_plate_w/2-24,-ca_plate_h/2+6]) square([t+2*slop, 20]); // tab slot gauge
        translate([-ca_plate_w/2+16,-ca_plate_h/2+16]) circle(d=8.4);        // M8 axle gauge
        translate([-ca_plate_w/2+16,-ca_plate_h/2+40]) circle(d=5.1);        // D shaft gauge
    }
}

// ============================================================================
// 3D ASSEMBLY
// ============================================================================
module ex(h) { linear_extrude(h) children(); }
module yz(x) { translate([x,0,0]) rotate([90,0,90]) children(); }
module xz(y) { translate([0,y,0]) rotate([90,0,0])  children(); }

// Nine separate discs, drawn separately, because that is what you glue up. Two
// solid blocks would hide a lamination error and would not match the cut files.
module rotor(ang=0) { translate([0,0,z_rot]) rotate([0,0,ang]) {
    ex(t) rotor_gear(0);                                  // bottom disc: no mortises,
    for (i=[1:rot_gear_n-1]) translate([0,0,i*t]) ex(t) rotor_gear();   // the posts land on it
    translate([0,0,rot_ring_z]) ex(t) rotor_ring();
    translate([0,0,rot_top_z])  ex(t) rotor_top();
    for (i=[0:spc_n-1]) {
        rotate([0,0,i*360/spc_n]) translate([spc_r,0,0]) rotate([90,0,90])
            translate([0,0,-t/2]) translate([0,rot_gear_n*t-t,0]) ex(t) spacer_a();
        rotate([0,0,180/spc_n+i*360/spc_n]) translate([spc_r,0,0]) rotate([90,0,90])
            translate([0,0,-t/2]) translate([0,rot_ring_z,0]) ex(t) spacer_b();
    }
} }
module funnel3d() {
    for (s=[0:3])
        translate([thr[0],thr[1],z_ceil+t]) rotate([0,0,fun_rz(s)]) translate([0,fb,0])
            rotate([fun_ang(s),0,0]) translate([0,0,-t/2]) ex(t) funnel_panel(s);
}
module chute3d() {
    translate([0,ramp_a[0],ramp_a[1]]) rotate([ramp_ang,0,0]) translate([0,ramp_len/2,-t/2]) ex(t) ramp_panel();
    yz(ramp_w/2)    ex(t) ramp_rail();
    yz(-ramp_w/2-t) ex(t) ramp_rail();
}
module assembly(ang=0, cut=false) {
    color("#d9b98a") {
        translate([0,0,z_base])  ex(t) base_plate();
        translate([0,0,z_deckA]) ex(t) deck_lower();
        translate([0,0,z_deckB]) ex(t) deck_upper();
        translate([0,0,z_ceil])  ex(t) ceiling_plate();
        translate([0,0,z_top])   ex(t) roof_plate();
    }
    color("#cbab7d") {
        if (!cut) { yz(XR) ex(t) side_lower(); yz(XR) ex(t) side_upper(1); }
        yz(XL-t) ex(t) side_lower(); yz(XL-t) ex(t) side_upper(-1);
    }
    color("#c4a476") {
        if (!cut) { xz(YF+t) ex(t) front_lower(); xz(YF+t) ex(t) front_upper(); }
        xz(YB) ex(t) back_lower(); xz(YB) ex(t) back_upper();
    }
    color("#c9a06a") rotor(ang);
    color("#8f8f8f") translate([0,0,z_deckA-8]) cylinder(d=8, h=z_ceil+t-(z_deckA-8));
    color("#efe9db") translate([0,0,z_wash]) ex(ta) thrust_washer();
    color("#1a1a1a") translate([mot[0],mot[1],z_mplate]) ex(t) motor_plate();
    color("#c9a06a") translate([mot[0],mot[1],z_pin]) rotate([0,0,-ang*RATIO]) ex(t) pinion();
    color("#6b6459") translate([mot[0]+mot_body_off,mot[1],z_mplate+t-19]) cylinder(d=28,h=19);
    color("#d9b98a") funnel3d();
    color("#c4a476") chute3d();
    color("#2f2f2f") translate([elec_c[0]-45, elec_c[1]-37, z_base+t]) {
        ex(t) elec_plate();
        translate([6,8,t+4])  cube([52,26,13]);   // ULN2003 board
        translate([6,42,t+4]) cube([34,18,6]);    // ESP32-C3 SuperMini
        translate([64,10,t+4]) cube([22,17,9]);   // buck converter
    }
    color("#8f8f8f") {
        translate([hatch_c[0], YB-t, hatch_c[1]]) rotate([90,0,0]) ex(t) cash_face();
        translate([hatch_c[0], YB-t-t, hatch_c[1]+face[1]/2+4])
            rotate([90,0,0]) rotate([0,0,-90]) ex(t) turnbutton();
    }
    // coin path
    color("#c09a68") {
        yz(cwx) ex(t) coin_wall();
        translate([chute_cx,chute_a[0],chute_a[1]]) rotate([chute_ang,0,0])
            translate([0,chute_len/2,-t/2]) ex(t) coin_chute();
        // reject cup, hung on the outside of the panel under the faceplate
        translate([ca_pos[0]-ret_w/2, YF+t, ret_z0]) rotate([90,0,0]) rotate([0,0,-90])
            translate([-ret_d,0,0]) ex(t) ret_floor();
        for (sx=[0,1]) translate([ca_pos[0]-ret_w/2+sx*(ret_w-t), YF+t, ret_z0])
            rotate([90,0,0]) rotate([0,0,-90]) ex(t) ret_side();
        translate([ca_pos[0]-ret_w/2, YF+t+ret_d, ret_z0]) ex(t) ret_lip();
    }
    color("#8f8f8f") translate([cash_c[0]-cash[0]/2, cash_c[1]-cash[1]/2, z_base+t])
        difference() {
            cube([cash[0],cash[1],cash[2]]);
            translate([t,t,t]) cube([cash[0]-2*t,cash[1]-2*t,cash[2]]);
        }
}

// ============================================================================
// SHEETS  (600 x 400 bed)
// ============================================================================
module lay_funnel(p) { translate([-fun_tL(p)+4, q_tab+4]) funnel_panel(p); }

module sheet1() { for (i=[0:2]) for (j=[0:1]) translate([102+i*197,102+j*197]) rotor_disc(false);
                  translate([300,300]) pinion();
                  translate([370,300]) motor_plate();
                  for (i=[0:2]) translate([430+i*40,262]) thrust_washer();
                  translate([420,320]) gauge();
                  translate([550,320]) coin_plate(); }
module sheet2() { translate([116,80]) coin_wall();
                  translate([116,220]) coin_chute();
                  translate([240,180]) tray_floor(); translate([340,180]) tray_side();
                  translate([440,180]) tray_side(); translate([340,290]) tray_end();
                  translate([440,290]) tray_end();
                  translate([240,290]) ret_floor(); translate([310,290]) ret_side();
                  translate([310,340]) ret_side(); }
// Sheets are nested by slug.html, which packs the baked outlines for whatever bed
// size you set and exports DXF or SVG. The hand placed sheet modules are gone.

// ============================================================================
if (MODE=="asm") assembly(0);
else if (MODE=="cut") assembly(0,true);
else if (MODE=="sheet") {
} else {
    if (PART=="pinion") pinion();
    else if (PART=="deck_lower") deck_lower(); else if (PART=="deck_upper") deck_upper();
    else if (PART=="ceiling_plate") ceiling_plate(); else if (PART=="base_plate") base_plate();
    else if (PART=="side_lower_l") side_lower(-1); else if (PART=="side_lower_r") side_lower(1);
    else if (PART=="coin_wall") coin_wall(); else if (PART=="coin_chute") coin_chute();
    else if (PART=="ret_floor") ret_floor(); else if (PART=="ret_side") ret_side();
    else if (PART=="ret_lip") ret_lip(); else if (PART=="ret_back") ret_back();
    else if (PART=="tray_floor") tray_floor(); else if (PART=="tray_side") tray_side();
    else if (PART=="tray_end") tray_end();
    else if (PART=="cash_face") cash_face(); else if (PART=="turnbutton") turnbutton();
    else if (PART=="elec_plate") elec_plate();
    else if (PART=="side_upper_l") side_upper(-1); else if (PART=="side_upper_r") side_upper(1);
    else if (PART=="front_lower") front_lower(); else if (PART=="front_upper") front_upper();
    else if (PART=="back_lower") back_lower(); else if (PART=="back_upper") back_upper();
    else if (PART=="roof_plate") roof_plate(); else if (PART=="stiffener") stiffener();
    else if (PART=="rotor_gear_a") rotor_gear(0); else if (PART=="rotor_gear_b") rotor_gear();
    else if (PART=="rotor_ring") rotor_ring(); else if (PART=="rotor_top") rotor_top();
    else if (PART=="spacer_a") spacer_a(); else if (PART=="spacer_b") spacer_b(); else if (PART=="motor_plate") motor_plate();
    else if (PART=="ramp_panel") ramp_panel(); else if (PART=="ramp_rail") ramp_rail();
    else if (PART=="splice") splice(); else if (PART=="gauge") gauge();
    else if (PART=="coin_plate") coin_plate();
    else if (PART=="funnel_front") funnel_panel(0);
    else if (PART=="funnel_left")  funnel_panel(2);
    else if (PART=="funnel_right") funnel_panel(3);
    else if (PART=="funnel_back")  funnel_back();
    else if (PART=="door_flap") door_flap(); else if (PART=="window") window_acrylic();
    else if (PART=="thrust_washer") thrust_washer();
}
