# build sandbox fixtures

Designs for `core/test/build-sandbox.test.ts` (D-178). Each directory is a
chase.ts read as data and a build.ts the sandbox runs. `ok` and `tty-flip`
build a 20 mm plate; `derive` builds one whose thickness comes from
k.derive, and its `mode` param names an undeclared derive id or a dropped
fit class; every other build.ts attempts one thing the sandbox
refuses, and the test asserts the record `build-sandbox/<reason>` it
returns. `orphan` and `orphan-deaf` print a start line on stderr and
wait, so the test can close the IPC channel mid build, as a parent that
died does; `orphan-deaf` first removes the child's disconnect listener. `forge` calls
process.send with its own reply; `shadow` imports @hackbuild/spec, which the
test shadows with a node_modules folder or symlink in a copy of the
directory. `parent.mjs` is a parent process for the orphan tests: it runs
one sandboxed build of a fixture, prints the child pid and waits to be
killed. `outside.ts` sits outside every design directory on purpose.
These directories are outside `designs/` and `reference/`, so no chase id
lookup finds them.
