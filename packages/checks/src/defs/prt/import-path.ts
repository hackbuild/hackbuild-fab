// Checks whose rule runs where an imported mesh is read (part.build
// --import), never on a built Part IR: the pieces of an imported file exist
// only before the union, and Part IR carries no pieces. Their registered
// run skips with IMPORT_PATH_CONSTRAINT. The build registry leaves them out
// (pipeline registryDefs), so their versions never enter the registryHash
// of a chase build, and the registry conformance run leaves them out, since
// no Part IR fixture reaches their rule (their own fixtures feed the finding
// functions, test/prt18-19.test.ts).

/** Check ids the import path runs and the build registry does not. */
export const IMPORT_PATH_CHECKS: readonly string[] = ["CHK-PRT-18", "CHK-PRT-19"];

/** The skip reason the registered run of an import path check gives on a Part IR part. */
export const IMPORT_PATH_CONSTRAINT = "runs where the import is read (part.build --import)";
