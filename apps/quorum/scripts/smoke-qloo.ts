import assert from "node:assert/strict";
import { extractAffinity } from "../src/lib/qloo-affinity";
import { insights, qlooReady, searchQloo, searchTags } from "../src/lib/qloo";

assert.equal(qlooReady(), true, "QUORUM_ENABLE_LIVE must be true for the smoke test.");

const artist = await searchQloo("Radiohead", "artist");
assert.ok(artist.length, "Search returned no artists.");
console.log(`search: ${artist[0].name} (${artist[0].id})`);

const tags = await searchTags("restaurant");
console.log(`tags: ${tags.length} restaurant-related tags`);

const favorites = artist.slice(0, 2);
const places = await insights(favorites, "place", "New York");
assert.ok(places.length, "Insights returned no place entities.");
const withAffinity = places.filter(entity => extractAffinity(entity) !== undefined);
console.log(`insights: ${places.length} places, ${withAffinity.length} with affinity evidence`);
if (!withAffinity.length) {
  console.warn("Warning: no query.affinity on this sample; Quorum will skip unscored rows instead of blocking the run.");
}

console.log("Qloo smoke test completed.");
