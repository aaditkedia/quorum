import test from "node:test";
import assert from "node:assert/strict";
import { signFavoriteSelection, verifyFavoriteSelection, resolveLiveFavorites } from "../src/lib/favorite-proof";
import type { Favorite } from "../src/lib/types";
const secret = "test-only-favorite-selection-signing-secret";
const now = 1_000_000;
const favorite: Favorite = { id: "AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE", name: "Hand-authored Shape Mock", type: "artist", source: "qloo" };
test("server selection canonicalizes UUID casing and ignores forged client metadata", () => {
  const selectionProof = signFavoriteSelection("event-a", favorite, secret, now);
  const forged = { ...favorite, id: "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff", name: "Forged name", type: "movie", selectionProof };
  assert.deepEqual(resolveLiveFavorites([forged], "event-a", secret, now + 1), [{ ...favorite, id: favorite.id.toLowerCase() }]);
});
test("arbitrary UUID and claimed Qloo provenance are insufficient without a server proof", () => {
  assert.throws(() => resolveLiveFavorites([favorite], "event-a", secret, now), /missing, invalid or expired/);
  assert.throws(() => signFavoriteSelection("event-a", { ...favorite, source: "synthetic" }, secret, now), /Only resolved/);
});
test("proof rejects another event, wrong key, tampering and expiration", () => {
  const proof = signFavoriteSelection("event-a", favorite, secret, now);
  assert.equal(verifyFavoriteSelection(proof, "event-b", secret, now + 1), null);
  assert.equal(verifyFavoriteSelection(proof, "event-a", "wrong", now + 1), null);
  assert.equal(verifyFavoriteSelection(proof.slice(1), "event-a", secret, now + 1), null);
  assert.equal(verifyFavoriteSelection(proof, "event-a", secret, now + 15 * 60_000), null);
});
test("case variants and repeated proofs cannot submit the same favorite twice", () => {
  const upper = signFavoriteSelection("event-a", favorite, secret, now);
  const lower = signFavoriteSelection("event-a", { ...favorite, id: favorite.id.toLowerCase() }, secret, now);
  assert.throws(() => resolveLiveFavorites([{ selectionProof: upper }, { selectionProof: lower }], "event-a", secret, now + 1), /different favorites/);
});
