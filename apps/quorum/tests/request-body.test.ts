import test from "node:test";
import assert from "node:assert/strict";
import { readBoundedJson } from "../src/lib/request-body";
const url = "http://localhost:3103/api/events";
test("valid JSON is decoded and malformed input has an actionable error", async () => {
  assert.deepEqual(await readBoundedJson(new Request(url, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: '{"name":"Maya"}' })), { name: "Maya" });
  await assert.rejects(readBoundedJson(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })), /valid JSON/);
  await assert.rejects(readBoundedJson(new Request(url, { method: "POST", body: "{}" })), /application\/json/);
});
test("chunked bodies without content-length are stopped at the byte cap", async () => {
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('"éééé"')); }, cancel() { cancelled = true; } });
  const request = new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half" } as RequestInit);
  await assert.rejects(readBoundedJson(request, 8), /too large/);
  assert.equal(cancelled, true);
});
