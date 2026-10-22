import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { QuorumEvent } from "./types";

const directory = () => process.env.QUORUM_DATA_DIR || path.join(process.cwd(), ".data", "quorum");
const file = () => path.join(directory(), "events.json");
const state = globalThis as typeof globalThis & { __quorumQueue?: Promise<unknown>; __quorumSecret?: string };

async function read(): Promise<QuorumEvent[]> {
  try { return JSON.parse(await readFile(file(), "utf8")) as QuorumEvent[]; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
}

export async function loadEventsJson() {
  await (state.__quorumQueue ?? Promise.resolve());
  return read();
}

export async function mutateEventsJson<T>(change: (events: QuorumEvent[]) => T | Promise<T>): Promise<T> {
  const task = (state.__quorumQueue ?? Promise.resolve()).then(async () => {
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    const events = await read();
    const result = await change(events);
    const temp = `${file()}.${randomBytes(8).toString("hex")}.tmp`;
    await writeFile(temp, JSON.stringify(events), { mode: 0o600 });
    await rename(temp, file());
    return result;
  });
  state.__quorumQueue = task.catch(() => undefined);
  return task;
}

export async function sessionSecretJson() {
  if (process.env.QUORUM_SESSION_SECRET && process.env.QUORUM_SESSION_SECRET.length >= 32) return process.env.QUORUM_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) throw new Error("Set QUORUM_SESSION_SECRET to at least 32 random characters.");
  if (state.__quorumSecret) return state.__quorumSecret;
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const secretFile = path.join(directory(), "session-secret");
  try { state.__quorumSecret = await readFile(secretFile, "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const secret = randomBytes(48).toString("base64url");
    try { await writeFile(secretFile, secret, { flag: "wx", mode: 0o600 }); state.__quorumSecret = secret; }
    catch (writeError) { if ((writeError as NodeJS.ErrnoException).code !== "EEXIST") throw writeError; state.__quorumSecret = await readFile(secretFile, "utf8"); }
  }
  return state.__quorumSecret!;
}
