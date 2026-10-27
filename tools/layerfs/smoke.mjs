#!/usr/bin/env node
// smoke.mjs — end-to-end LayerFS flow test for this repo (no sandbox needed).
// Exercises: fork → fs.write → fs.read → diff → merge → publish → main advanced.
// Publish semantics (from the CLI contract): branch.publish makes the branch's
// head main's NEXT LAYER — inside the Store. LayerFS never writes the repo
// folder after init; "landed" is verified by reading the file back from main.
// Usage: ./lf smoke   (lf dispatches "smoke" here; re-execs under sudo when the
// Store is root-owned, same rule as every other lf command.)
import { spawnSync } from "node:child_process";
import { accessSync, constants, statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const CHECKOUT =
  process.env.LAYERFS_CHECKOUT ?? `${process.env.HOME}/tools/layerfs`;
const PROJECT = process.env.LAYERFS_PROJECT ?? "crm-home";
const STORE = process.env.LAYERFS_STORE_PATH ?? "";
// Unique branch per run: there is no branch-delete API, and merge refuses a
// NameTaken release, so reusing a fixed name would fail on the second run.
const BRANCH = `smoke-${Date.now().toString(36)}`;
const RELEASE = `${BRANCH}-release`;
// fs.* paths are absolute within the branch tree (leading "/", no "."/"..")
const FILE = "/tools/layerfs/SMOKE.md";

// --- root re-exec (same rule as lf.mjs) --------------------------------------
// A root-owned Store sits under a 0700 root dir: a plain user cannot even
// stat through it (EACCES), so "inaccessible" also means "needs root".
let needsRoot = true;
try {
  accessSync(STORE, constants.R_OK);
  needsRoot = statSync(STORE).uid !== process.geteuid();
} catch {
  /* inaccessible or missing → try root */
}
if (process.geteuid() !== 0 && process.env.LF_NO_SUDO !== "1" && needsRoot) {
  const script = fileURLToPath(import.meta.url);
  const res = spawnSync(
    "sudo",
    ["-E", process.execPath, script, ...process.argv.slice(2)],
    { stdio: "inherit", env: process.env },
  );
  process.exit(res.status ?? 1);
}

let failures = 0;
const step = (name, ok, detail = "") => {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) failures++;
};

const { LayerFS } = await import(
  pathToFileURL(path.join(CHECKOUT, "api/agent/src/index.js")).href
);
const lf = await LayerFS.open(PROJECT);

try {
  // 1. fork from main (unique name: always a fresh branch)
  const forked = await lf.branch.fork(BRANCH, "main");
  step("fork from main", !!forked, JSON.stringify(forked).slice(0, 80));

  // 2. write a file on the branch
  const marker = `smoke ${new Date().toISOString()}`;
  const written = await lf.fs.write(
    BRANCH,
    FILE,
    `# ${marker}\n`,
    "smoke: write",
  );
  step("fs.write", !!written);

  // 3. read it back
  const read = await lf.fs.read(BRANCH, FILE);
  const text = read?.content ?? read?.text ?? JSON.stringify(read);
  step(
    "fs.read round-trip",
    String(text).includes(marker),
    String(text).slice(0, 60),
  );

  // 4. diff vs main shows the file
  const diff = await lf.branch.diff_branches("main", BRANCH, 50, 0, {
    hunks: false,
  });
  const changed = JSON.stringify(diff);
  step(
    `diff_branches main→${BRANCH}`,
    changed.includes("SMOKE.md"),
    changed.slice(0, 120),
  );

  // 5. merge main + branch → release
  const merged = await lf.branch.merge(
    "main",
    BRANCH,
    RELEASE,
    "smoke test merge",
  );
  step(`merge → ${RELEASE}`, !!merged);

  // 6. publish the release → main's next Layer
  const published = await lf.branch.publish(RELEASE);
  step(
    `publish ${RELEASE}`,
    !!published,
    published?.overwroteCount
      ? `overwrote ${published.overwroteCount}`
      : "no overwrites",
  );

  // 7. main advanced: the file is now readable from main
  const fromMain = await lf.fs.read("main", FILE);
  const mainText = fromMain?.content ?? fromMain?.text ?? "";
  step(
    "main advanced (fs.read main shows the file)",
    String(mainText).includes(marker),
    String(mainText).slice(0, 60),
  );
} finally {
  await lf.close().catch(() => {});
}

console.log(
  failures === 0
    ? "\nSMOKE TEST: ALL PASS"
    : `\nSMOKE TEST: ${failures} FAILURE(S)`,
);
process.exit(failures === 0 ? 0 : 1);
