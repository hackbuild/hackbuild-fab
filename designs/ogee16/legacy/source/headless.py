"""Run a built viewer's module body under stub three.js/DOM.
  headless.py <probe.js> [page.html]      default page is ogee16.html
ALWAYS regenerates from the current HTML: a stale /tmp harness with the old page
baked in wasted a whole debugging pass, and pointing it at the wrong page wasted
another."""
import re, subprocess, sys, os
PAGE = sys.argv[2] if len(sys.argv) > 2 else "ogee16.html"
html = open(os.path.join(os.path.dirname(__file__), "..", "out", PAGE)).read()
print(f"[harness] {PAGE}")
s = html.index("const P = {"); e = html.rindex("</script>")
js = html[s:e]
head = open("/tmp/head.js").read()
head = head.replace("class Obj{constructor(){this.position=new V3();this.rotation=new V3();",
  "class Obj{constructor(){this.position=new V3();this.rotation=Object.assign(new V3(),"
  "{set(x,y,z,o){this.x=x;this.y=y;this.z=z;this.order=o;return this}});")
head = head.replace("add(c){this.children.push(c);return this}",
                    "add(c){this.children.push(c);c.parent=this;return this}")
js = js.replace("import * as THREE from 'three';", "")
js = js.replace("import {OrbitControls} from 'three/addons/controls/OrbitControls.js';", "")
js = re.sub(r"^const P = ",
  "const THREE=_three();\nconst OrbitControls=function(){return {target:{set(){}},update(){}}};\nconst P = ",
  js, count=1)
js = js.replace("  row(t,'sheet thickness'",
  "  console.log('SELF CHECK FAILS:',fails.length);"
  "for(const f of fails)console.log('  !',f);\n  row(t,'sheet thickness'")
tail = open(sys.argv[1]).read() if len(sys.argv) > 1 else ""
open("/tmp/_run.mjs", "w").write(head + js + tail)
sys.exit(subprocess.run(["node", "/tmp/_run.mjs"]).returncode)
