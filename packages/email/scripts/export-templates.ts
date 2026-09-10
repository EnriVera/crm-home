import { spawnSync } from "node:child_process";

const result = spawnSync(
  "octane-email",
  ["export", "-d", "src/templates", "--outDir", "out"],
  { stdio: "inherit", shell: false },
);

process.exit(result.status ?? 0);
