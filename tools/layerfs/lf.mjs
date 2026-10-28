#!/usr/bin/env node
// lf.mjs — workflow helpers over @layerfs/agent for this repo.
// Env comes from lf.env (sourced by the `lf` bash wrapper) or the shell.
//
// Commands:
//   lf init            one-time Store install from LAYERFS_SOURCE (must run as root; see README)
//   lf fork <branch> [from-ref]          fork a branch (default: from main)
//   lf run <branch> "<cmd>" [message]    one-shot: sandbox → mount → exec → commit → unmount
//   lf ship <branch> [message]           release = merge(main, branch) → publish
//                                        (publish = release head becomes main's next
//                                        Layer IN THE STORE; the repo folder is never
//                                        written by LayerFS after init)
//   lf land <branch> [message]           the publish that lands: merge → diff →
//                                        write text delta to LAYERFS_SOURCE (gitignore-
//                                        aware, clobber-checked) → publish → main
//                                        advances. Use instead of ship when the change
//                                        must reach the repo folder.
//   lf status                            branches + sandboxes
//
// Root model: the installed Store is root:root 0700/0600 (the sandbox daemons open it as
// root). When the Store is root-owned and we are not root, we re-exec ourselves under
// `sudo -E` (password prompted by sudo). Set LF_NO_SUDO=1 to disable the re-exec.
import { spawnSync } from "node:child_process";
import {
  accessSync,
  chmodSync,
  chownSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const CHECKOUT =
  process.env.LAYERFS_CHECKOUT ?? `${process.env.HOME}/tools/layerfs`;
const PROJECT = process.env.LAYERFS_PROJECT ?? "crm-home";
const STORE = process.env.LAYERFS_STORE_PATH ?? "";
const SOURCE = process.env.LAYERFS_SOURCE ?? "";
const INIT_TIMEOUT = Number(process.env.LAYERFS_INIT_TIMEOUT ?? 300000);

const [, , cmd, ...args] = process.argv;

function fail(msg, code = 2) {
  console.error(`lf: ${msg}`);
  process.exit(code);
}
function out(value) {
  console.log(
    typeof value === "string" ? value : JSON.stringify(value, null, 2),
  );
}

// --- root re-exec -------------------------------------------------------------
function maybeReExec() {
  if (process.geteuid() === 0 || process.env.LF_NO_SUDO === "1") return;
  // The Store lives under a 0700 dir owned by whoever installed it. When that
  // owner is root, a plain user cannot even stat through the dir (EACCES),
  // so "inaccessible" also means "needs root" — not only "uid === 0".
  let foreign = true;
  try {
    accessSync(STORE, constants.R_OK);
    foreign = statSync(STORE).uid !== process.geteuid();
  } catch {
    /* inaccessible (EACCES through the private dir) or missing: try root */
  }
  const needRoot = cmd === "init" || foreign;
  if (!needRoot) return;
  const sudoArgs = ["-E"];
  // SUDO_ASKPASS set (askpass helper): non-interactive hosts (agent shells
  // without a TTY) authenticate via `sudo -A` instead of a password prompt.
  if (process.env.SUDO_ASKPASS) sudoArgs.push("-A");
  const script = fileURLToPath(import.meta.url);
  const res = spawnSync("sudo", [...sudoArgs, process.execPath, script, ...process.argv.slice(2)], {
      stdio: "inherit",
      env: process.env,
    },
  );
  process.exit(res.status ?? 1);
}
maybeReExec();

// smoke delegates to smoke.mjs (same env, same root re-exec rule lives there)
if (cmd === "smoke") {
  const res = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./smoke.mjs", import.meta.url))],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  process.exit(res.status ?? 1);
}

if (!STORE) fail("LAYERFS_STORE_PATH is not set (see lf.env.example)");
if (!existsSync(STORE) && cmd !== "init") {
  fail(
    `Store not installed at ${STORE}\n  one-time bootstrap (asks for your sudo password):\n    cd tools/layerfs && ./lf init`,
  );
}

const { LayerFS } = await import(
  pathToFileURL(path.join(CHECKOUT, "api/agent/src/index.js")).href
);
const layerfs = cmd === "init" ? null : await LayerFS.open(PROJECT);

async function main() {
  switch (cmd) {
    case "init": {
      if (!SOURCE) fail("LAYERFS_SOURCE is not set (see lf.env.example)");
      if (existsSync(STORE)) fail(`Store already installed at ${STORE}`);
      const lf = await LayerFS.init(PROJECT, SOURCE, INIT_TIMEOUT);
      const branches = await lf.project.list_branches(50, 0);
      out({ installed: PROJECT, store: STORE, source: SOURCE, branches });
      await lf.close();
      return;
    }
    case "fork": {
      const [name, from = "main"] = args;
      if (!name) fail("usage: lf fork <branch> [from-ref]");
      out(await layerfs.branch.fork(name, from));
      return;
    }
    case "run": {
      const [branch, command, message] = args;
      if (!branch || !command) fail('usage: lf run <branch> "<cmd>" [message]');
      const { sandbox } = await layerfs.sandbox.create();
      try {
        const ws = await layerfs.workspace.mount(sandbox, branch);
        try {
          const run = await layerfs.workspace.exec(
            ws,
            command,
            message ?? command,
          );
          out({
            exec: {
              exitCode: run.exitCode,
              stdout: run.stdout,
              stderr: run.stderr,
            },
          });
          if (run.exitCode !== 0) process.exitCode = run.exitCode;
          try {
            const committed = await layerfs.workspace.commit(
              ws,
              message ?? `run: ${command}`,
            );
            out({ committed });
          } catch (e) {
            if (e?.code === "UpToDate")
              out({ committed: "UpToDate (no changes)" });
            else throw e;
          }
        } finally {
          await layerfs.workspace.unmount(ws);
        }
      } finally {
        await layerfs.sandbox.close(sandbox);
      }
      return;
    }
    case "land": {
      const [branch, message] = args;
      if (!branch) fail("usage: lf land <branch> [message]");
      if (!SOURCE) fail("LAYERFS_SOURCE is not set");
      // Unique release per run: disk writes are idempotent, so a failed land
      // is retried with a fresh merge (there is no branch-delete API).
      const release = `${branch}-release-${Date.now().toString(36)}`;
      const merged = await layerfs.branch.merge(
        "main",
        branch,
        release,
        message ?? `land ${branch}`,
      );
      out({ merged: { kind: merged?.kind, release } });

      // Full delta main→release, paged by cursor (pageSize max 1000).
      const delta = [];
      let cursor = null;
      for (;;) {
        const page = await layerfs.branch.diff_branches(
          "main",
          release,
          1000,
          0,
          {
            hunks: false,
            ...(cursor ? { cursor } : {}),
          },
        );
        delta.push(...(page.items ?? []));
        if (!page.hasMore) break;
        cursor = page.nextCursor;
      }

      const landed = [],
        removed = [],
        skipped = [],
        binaries = [];
      const uid = Number(process.env.SUDO_UID ?? process.geteuid());
      const gid = Number(process.env.SUDO_GID ?? process.getegid());
      const gitignored = (rel) =>
        spawnSync("git", ["-C", SOURCE, "check-ignore", "-q", "--", rel], {
          stdio: "ignore",
        }).status === 0;
      const writeDisk = (abs, text, dir = false) => {
        if (dir) {
          mkdirSync(abs, { recursive: true, mode: 0o755 });
        } else {
          mkdirSync(path.dirname(abs), { recursive: true, mode: 0o755 });
          writeFileSync(abs, text, "utf8");
          chmodSync(abs, 0o644);
        }
        try {
          chownSync(abs, uid, gid);
        } catch {
          /* ownership best-effort (e.g. NTFS no-op) */
        }
      };
      // Clobber protection: before overwriting, the disk file must match the
      // reference side — main's old content for Modified/Removed, the release
      // content for Added (main does not have it yet). Local edits are skipped.
      const diskMatches = async (item, ref) => {
        const abs = path.join(SOURCE, item.path.replace(/^\//, ""));
        if (!existsSync(abs)) return item.kind !== "Modified";
        try {
          const refText = await layerfs.fs.read(ref, item.path);
          return readFileSync(abs, "utf8") === (refText?.text ?? "");
        } catch (e) {
          if (e?.code === "Binary") return "binary";
          return false; // missing on the ref side or unreadable: don't clobber
        }
      };

      for (const item of delta) {
        const rel = item.path.replace(/^\//, "");
        const abs = path.join(SOURCE, rel);
        if (gitignored(rel)) {
          skipped.push(`${rel} (gitignored)`);
          continue;
        }
        if (item.type === "dir" || item.type === "directory") {
          if (item.kind === "Removed") {
            rmSync(abs, { recursive: true, force: true });
            removed.push(`${rel}/`);
          } else {
            writeDisk(abs, null, true);
            landed.push(`${rel}/`);
          }
          continue;
        }
        if (item.type !== "file") {
          skipped.push(`${rel} (type ${item.type}: not landable)`);
          continue;
        }
        if (item.kind === "Modified" && item.content === false) {
          skipped.push(`${rel} (metadata-only change)`);
          continue;
        }
        const ok = await diskMatches(
          item,
          item.kind === "Added" ? release : "main",
        );
        if (ok === "binary") {
          binaries.push(rel);
          continue;
        }
        if (!ok) {
          skipped.push(
            `${rel} (local edits or unexpected disk state — not overwritten)`,
          );
          continue;
        }
        if (item.kind === "Removed") {
          rmSync(abs, { force: true });
          removed.push(rel);
        } else {
          try {
            const nextText = await layerfs.fs.read(release, item.path);
            writeDisk(abs, nextText?.text ?? "");
            landed.push(rel);
          } catch (e) {
            if (e?.code === "Binary") binaries.push(rel);
            else throw e;
          }
        }
      }

      const published = await layerfs.branch.publish(release);
      out({
        published,
        landed: landed.length,
        removed: removed.length,
        skipped,
        binaries,
      });
      if (binaries.length > 0) {
        console.error(
          `lf: WARNING ${binaries.length} binary file(s) changed in the Store but ` +
            "cannot be read back as text (fs.read is text-only); land them manually: " +
            binaries.join(", "),
        );
      }
      console.log(
        `lf: next: cd ${JSON.stringify(SOURCE)} && git status && git diff`,
      );
      return;
    }
    case "ship": {
      const [branch, message] = args;
      if (!branch) fail("usage: lf ship <branch> [message]");
      const release = `${branch}-release`;
      const existing = await layerfs.project.list_branches(1000, 0);
      if (existing.items?.some((b) => b.name === release)) {
        fail(
          `${release} already exists (no branch-delete API). Re-run with a fresh branch or rename.`,
        );
      }
      const merged = await layerfs.branch.merge(
        "main",
        branch,
        release,
        message ?? `ship ${branch}`,
      );
      out({ merged });
      const published = await layerfs.branch.publish(release);
      out({ published });
      if (published.overwroteCount > 0) {
        console.error(
          `lf: WARNING publish overwrote ${published.overwroteCount} Layer(s): ${published.overwrote?.join(", ")}`,
        );
      }
      return;
    }
    case "status": {
      const branches = await layerfs.project.list_branches(1000, 0);
      const sandboxes = await layerfs.project.list_sandboxes(50, 0);
      out({
        project: PROJECT,
        store: STORE,
        branches: branches.items ?? branches,
        sandboxes: sandboxes.items ?? sandboxes,
      });
      return;
    }
    default:
      fail(
        `unknown command: ${cmd ?? "(none)"}\ncommands: init · fork · run · ship · status (anything else → raw layerfs CLI)`,
      );
  }
}

try {
  await main();
} catch (e) {
  out({
    code: e?.code ?? "Failed",
    message: e?.message ?? String(e),
    detail: e?.detail ?? null,
  });
  process.exitCode = 125;
} finally {
  if (layerfs) await layerfs.close().catch(() => {});
}
