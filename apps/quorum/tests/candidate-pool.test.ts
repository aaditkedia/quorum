import test from "node:test";
import assert from "node:assert/strict";
import { selectPoolIds } from "../src/lib/candidate-pool";

test("every persona's leading candidates enter the capped shared pool", () => {
  const first = Array.from({ length: 30 }, (_, i) => ({ entity_id: `first-${i}` }));
  const second = Array.from({ length: 30 }, (_, i) => ({ entity_id: `second-${i}` }));
  const ids = selectPoolIds([first, second], 8);
  assert.equal(ids.length, 8);
  assert.ok(ids.includes("first-0"));
  assert.ok(ids.includes("second-0"));
  assert.deepEqual(ids, selectPoolIds([second, first], 8));
});
test("eight disjoint personas each contribute their best candidate before lower ranks", () => {
  const lists = Array.from({ length: 8 }, (_, person) => Array.from({ length: 30 }, (_, rank) => ({ entity_id: `person-${person}-rank-${rank}` })));
  const ids = selectPoolIds(lists, 8);
  assert.equal(ids.length, 8);
  assert.ok(ids.every(id => id.endsWith("-rank-0")));
  assert.deepEqual(ids, selectPoolIds(lists.slice().reverse(), 8));
});
test("case variants within one list cannot give one entity duplicate votes", () => {
  assert.deepEqual(selectPoolIds([[{ entity_id: "ABC" }, { entity_id: "abc" }, { entity_id: "def" }]]), ["abc", "def"]);
});
