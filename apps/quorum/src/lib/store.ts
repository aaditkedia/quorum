import "server-only";
import type { QuorumEvent } from "./types";
import { loadEventsDb, mutateEventsDb, sessionSecretDb } from "./store-db";
import { loadEventsJson, mutateEventsJson, sessionSecretJson } from "./store-json";

export const hostedStore = () => Boolean(process.env.DATABASE_URL);

export async function loadEvents(): Promise<QuorumEvent[]> {
  return hostedStore() ? loadEventsDb() : loadEventsJson();
}

export async function mutateEvents<T>(change: (events: QuorumEvent[]) => T | Promise<T>): Promise<T> {
  if (hostedStore()) return mutateEventsDb(change);
  return mutateEventsJson(change);
}

export async function sessionSecret() {
  return hostedStore() ? sessionSecretDb() : sessionSecretJson();
}
