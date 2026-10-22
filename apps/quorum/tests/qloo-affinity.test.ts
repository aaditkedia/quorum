import test from "node:test";
import assert from "node:assert/strict";
import { extractAffinity } from "../src/lib/qloo-affinity";

test("extractAffinity reads query.affinity and normalizes percent scales", () => {
  assert.equal(extractAffinity({ entity_id: "00000000-0000-4000-8000-000000000001", name: "A", subtype: "urn:entity:artist", query: { affinity: 0.42 } }), 0.42);
  assert.equal(extractAffinity({ entity_id: "00000000-0000-4000-8000-000000000001", name: "A", subtype: "urn:entity:artist", affinity: 88 }), 0.88);
  assert.equal(extractAffinity({ entity_id: "00000000-0000-4000-8000-000000000001", name: "A", subtype: "urn:entity:artist" }), undefined);
});
