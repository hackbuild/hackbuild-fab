include <params.scad>
use <printed.scad>
intersection(){
  import("../out/print/face_asm.stl");
  translate([-20,-20,80]) cube([60,60,30]);
}
