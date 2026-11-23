// r.js — the CJS driver. main.ts is a 14-byte proxy (require('./r')) so the
// harness's ESM load is trivial and the real work starts in CommonJS, whose
// require() is cheaper than ESM import for a big module. Flags are set BEFORE
// solve.js loads so all of its code runs under them.
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const { setFlagsFromString } = require('node:v8');

// Baseline flags (A/B'd in-session; see ledger). Incremental marking off
// (the house baseline does the same). TurboFan ON — A/B showed --no-turbofan
// costs more in slower Maglev code than it saves in compile threads here.
setFlagsFromString('--no-incremental-marking');

const { runJsonBuf, Sink } = require('./solve.js');

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR || '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8'));

// Answers go straight into one preallocated Buffer: no giant string join,
// no second UTF-8 encode pass over the ~7 MB answer. 24 MB covers the
// practice set (~7.5 MB) with room for a bigger fresh draw; the sink doubles
// if a piece ever does not fit.
const sink = new Sink(24 * 1024 * 1024);
sink.write('[');
for (let i = 0; i < cases.length; i++) {
  if (i > 0) sink.write(',');
  runJsonBuf(cases[i].input, sink);
}
sink.write(']');

mkdirSync(OUTPUT_DIR, { recursive: true });
writeFileSync(join(OUTPUT_DIR, 'answers.json'), sink.bytes());
