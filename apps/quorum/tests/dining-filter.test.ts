import test from "node:test";
import assert from "node:assert/strict";
import { isFoodPlace } from "../src/lib/dining-filter";

const t = (id: string) => ({ id, type: id.split(":").slice(0, 4).join(":") });

test("dining filter keeps restaurants and cafes by primary place genre", () => {
  assert.equal(isFoodPlace({ tags: [t("urn:tag:ambience:qloo:casual"), t("urn:tag:genre:place:restaurant"), t("urn:tag:genre:place:market")] }), true);
  assert.equal(isFoodPlace({ tags: [t("urn:tag:genre:place:sushi_restaurant"), t("urn:tag:genre:place:japanese_restaurant")] }), true);
  assert.equal(isFoodPlace({ tags: [{ tag_id: "urn:tag:genre:place:cafe", name: "Cafe" }] }), true);
});

test("dining filter rejects stores, malls and hotels even when Qloo's restaurant tag matched", () => {
  assert.equal(isFoodPlace({ tags: [t("urn:tag:category:place:restaurant"), t("urn:tag:genre:place:department_store"), t("urn:tag:genre:place:shopping_mall")] }), false);
  assert.equal(isFoodPlace({ tags: [t("urn:tag:genre:place:home_goods_store"), t("urn:tag:genre:place:antique_store"), t("urn:tag:genre:place:cafe")] }), false);
  assert.equal(isFoodPlace({ tags: [t("urn:tag:genre:place:personal_care"), t("urn:tag:genre:place:spanish_restaurant")] }), false);
});

test("dining filter falls back to category tags and rejects untagged entities", () => {
  assert.equal(isFoodPlace({ tags: [t("urn:tag:category:place:bakery")] }), true);
  assert.equal(isFoodPlace({ tags: [] }), false);
  assert.equal(isFoodPlace({}), false);
});
