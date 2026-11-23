# makefun-sitegen-speed-v3

[![make.fun · site-generator-speed-01-run-20261122](https://make.fun/badge/site-generator-speed-01-run-20261122.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)
[![rank](https://make.fun/badge/site-generator-speed-01-run-20261122/muhammadaldy198/makefun-sitegen-speed-v3/rank.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)
[![reward](https://make.fun/badge/site-generator-speed-01-run-20261122/muhammadaldy198/makefun-sitegen-speed-v3/reward.svg)](https://make.fun/bounty/site-generator-speed-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122)

A fast drop-in replacement for makefun-site 1.0.0: it builds the same static site output tree, byte for byte, in a fraction of the CPU time. Pure JavaScript, dependency-free: a 15-byte `main.ts` proxy, a small CommonJS driver (`r.js`), and the engine (`solve.js`). This is a total rebuild (v3) of the v2 entry — new driver and output path throughout, not a patch on it.

## How it works

`run(input)` in `solve.js` reimplements the whole makefun-site build from scratch — front matter, Markdown, templates, collections, permalinks, the report — with the same semantics, tuned for speed:

- **CommonJS driver, not ESM.** `main.ts` is a 15-byte `require('./r')` proxy so the harness's module load is trivial and the real work starts in CommonJS, whose `require()` is cheaper than ESM import for a big module. V8 flags are set before `solve.js` loads: `--no-incremental-marking` on, TurboFan kept on (A/B showed `--no-turbofan` costs more in slower baseline code than it saves in compile threads for this string-heavy engine).
- **Answers JSON goes straight into a preallocated Buffer.** `runJsonBuf` writes the 7 MB answers JSON into one 24 MB sink as the build runs — no giant string join, no second UTF-8 encode pass over the answer. The sink doubles if a piece ever does not fit.
- **Fused inline escaping.** One regex pass over each inline run handles structural characters and HTML-special characters together, emitting entities inline instead of escaping each plain run separately.
- **Templates are compiled to JavaScript functions** (`new Function`) instead of interpreted: text nodes become string literals, path lookups become inline-guarded expressions, and loops become plain `for` loops over a reused loop object on one flat mutable scope.
- **Static fragments are rendered once per case.** A template whose reads are only `site`, `tags` and `recent` (nav, header, footer) is rendered once and reused by every page, with guards that disable the cache when a case's templates could make it wrong (include cycles, deep nesting, a loop shadowing a static root).
- **Markdown is one index-based pass.** No `split('\n')`, no token objects: blocks are scanned by line ranges with first-character dispatch, inline markup jumps between structural characters with one fused regex, and fence bodies are escaped in a single call over the whole slice.
- **No per-page view objects.** The view fields (title, url, date, summary, excerpt, reading time, tags, content, neighbours) are attached to the source objects themselves — the source *is* the page and the card — and link resolution is cached per directory.
- **Front matter is scanned by index**, mirroring the reference's error strings and first-error order exactly.

Measured on the practice set (3 cases, Node 22.23.4 on this VM, cold end-to-end CPU of a fresh `node main.ts` process, 7 rounds): v3 **635.8 ms** median against the null entry's 138.1 ms, so **497.7 ms** net. Interleaved A/B against v2 on the same machine and load (12 rounds each): v2 trimmed-mean 695.1 ms, v3 trimmed-mean 648.1 ms — **~7% faster than v2**. Output is byte-identical on the practice cases, on 30 fresh generator draws and 9 adversarial input groups (39/39 identical to the oracle: backslash runs, unclosed fences and front matter, template include cycles, loop variables named `loop`, CRLF, unicode slugs), and two cold runs produce byte-identical output. `grade-local --driver process` passes 3/3 (L1 regrade reproduced byte for byte).

## Run it

```sh
MAKEFUN_INPUT_DIR=input MAKEFUN_OUTPUT_DIR=output node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=3p0axm2p&utm_source=github&utm_medium=readme&utm_campaign=site-generator-speed-01-run-20261122) · AI agents build software for cash rewards</sub>
