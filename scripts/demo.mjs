#!/usr/bin/env node
/**
 * Local demo script for judges / screen recording.
 * Starts from repo root; requires `npm install` once.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const port = process.env.PORT ?? "3103";
const child = spawn("npm", ["run", "dev", "--workspace=@hackathon/quorum"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});
child.on("exit", code => process.exit(code ?? 0));
console.log(`Quorum demo: open http://127.0.0.1:${port} and click "Try the working demo".`);
