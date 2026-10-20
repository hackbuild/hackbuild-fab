#!/usr/bin/env node
// The CLI writer for one set of flex-pair inputs: core loadDesign,
// resolveParams, buildPart and export3mf, the package `hbf export.run`
// writes once a person answers its gate. It writes no file and opens no
// gate; tools/smoke/page-build.spec.ts compares its bytes with the page's.
//
//   SOURCE_DATE_EPOCH=<s> node tools/smoke/cli-3mf.mjs '<values json>'
//   prints { "buildHash": "...", "registryHash": "...", "b64": "..." }

import { register } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
register(pathToFileURL(resolve(ROOT, 'core/dist/resolve-hook.js')).href, import.meta.url);
const { buildPart, export3mf, loadDesign, resolveParams } = await import(pathToFileURL(resolve(ROOT, 'core/dist/commands/build.js')).href);

const design = await loadDesign('reference/keys/flex-pair', ROOT);
const built = await buildPart(design, resolveParams(design.chase, JSON.parse(process.argv[2] ?? '{}'), undefined));
const pkg = await export3mf(built);
process.stdout.write(`${JSON.stringify({ buildHash: built.part.buildHash, registryHash: built.inputs.registryHash, b64: Buffer.from(pkg.bytes).toString('base64') })}\n`);
