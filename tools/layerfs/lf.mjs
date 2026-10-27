#!/usr/bin/env node
// lf.mjs — workflow helpers over @layerfs/agent for this repo.
// Env comes from lf.env (sourced by the `lf` bash wrapper) or the shell.
//
// Commands:
//   lf init            one-time Store install from LAYERFS_SOURCE (must run as root; see README)
//   lf fork <branch> [from-ref]          fork a branch (default: from main)
//   lf run <branch> "<cmd>" [message]    one-shot: sandbox → mount → exec → commit → unmount
//   lf ship <branch> [message]           safe publish: release = merge(main, branch) → publish
//   lf status                            branches + sandboxes
//
// Root model: the installed Store is root:root 0700/0600 (the sandbox daemons open it as
// root). When the Store is root-owned and we are not root, we re-exec ourselves under
// `sudo -E` (password prompted by sudo). Set LF_NO_SUDO=1 to disable the re-exec.
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
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
  const storeExists = existsSync(STORE);
  const rootOwned = storeExists && statSync(STORE).uid === 0;
  const needRoot = cmd === "init" || rootOwned;
  if (!needRoot) return;
  const script = fileURLToPath(import.meta.url);
  const res = spawnSync(
    "sudo",
    ["-E", process.execPath, script, ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: process.env,
    },
  );
  process.exit(res.status ?? 1);
}
maybeReExec();

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
