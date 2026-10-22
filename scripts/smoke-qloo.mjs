#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const env = { ...process.env, NODE_ENV: "test" };
if (!env.QLOO_API_KEY) {
  console.error("Set QLOO_API_KEY (and QUORUM_ENABLE_LIVE=true) before running the live Qloo smoke test.");
  process.exit(1);
}
env.QUORUM_ENABLE_LIVE ??= "true";
env.QLOO_BASE_URL ??= "https://hackathon.api.qloo.com";
env.TSX_TSCONFIG_PATH ??= resolve(root, "apps/quorum/tsconfig.json");

const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", resolve(root, "apps/quorum/scripts/smoke-qloo.ts")], {
  stdio: "inherit",
  env,
  cwd: root,
});
process.exit(result.status ?? 1);
