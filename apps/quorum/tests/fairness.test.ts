import test from "node:test";
import assert from "node:assert/strict";
import { negotiate } from "../src/lib/fairness";
import { syntheticCandidates } from "../src/lib/demo";
import type { Candidate, Attendee } from "../src/lib/types";
const people = [{ id: "a" }, { id: "b" }];
const pick = (id: string, category: Candidate["category"], scores: [number, number]): Candidate => ({ id, category, scores: { a: scores[0], b: scores[1] }, name: id, type: "place", tags: [], description: "Hand-authored test mock", source: "synthetic" });
const fixed = [pick("d1", "dining", [.8, .8]), pick("d2", "dining", [.8, .8]), pick("p", "playlist", [.8, .8])];
test("maximin protects the least-happy person despite a higher group-average alternative", () => {
  const plan = negotiate(people, [...fixed, pick("safe", "activity", [.6, .6]), pick("flashy", "activity", [1, .3])]);
  assert.ok(plan.picks.includes("safe"));
  assert.ok(!plan.picks.includes("flashy"));
  assert.ok(plan.minimum > plan.baselineMinimum);
  assert.equal(plan.combinations, 2);
});
test("Borda resolves equal minima before stable ID order", () => {
  const plan = negotiate(people, [...fixed, pick("z-better-rank", "activity", [.8, .4]), pick("a-worse-rank", "activity", [.6, .4]), pick("c-outlier", "activity", [.1, .9])]);
  assert.ok(plan.picks.includes("z-better-rank"));
});
test("missing, nonfinite and out-of-range affinity are rejected", () => {
  const broken = pick("bad", "activity", [.8, .8]);
  delete broken.scores.b;
  assert.throws(() => negotiate(people, [...fixed, broken]), /affinity/);
  broken.scores.b = NaN;
  assert.throws(() => negotiate(people, [...fixed, broken]), /affinity/);
  broken.scores.b = 1.1;
  assert.throws(() => negotiate(people, [...fixed, broken]), /affinity/);
});
test("selection and minimum are invariant to candidate and attendee order", () => {
  const group = [0, 1, 2, 3].map(profile => ({ id: `person-${profile}`, name: "Fictional attendee", profile, favorites: [] })) as Attendee[];
  const candidates = syntheticCandidates(group);
  const first = negotiate(group, candidates);
  const reverse = negotiate(group.slice().reverse(), candidates.slice().reverse());
  assert.deepEqual(first.picks.slice().sort(), reverse.picks.slice().sort());
  assert.equal(first.minimum, reverse.minimum);
  assert.ok(first.minimum >= first.baselineMinimum);
});
test("insufficient category evidence cannot produce a pretend itinerary", () => {
  assert.throws(() => negotiate(people, fixed), /Not enough/);
  assert.throws(() => negotiate([], []), /attendee/);
});
test("the same live venue cannot be selected for both dining and the activity", () => {
  const repeated = { ...pick("activity:shared", "activity", [1, 1]), entityId: "SHARED-PLACE" };
  const dining = { ...fixed[0], entityId: "shared-place" };
  const alternative = { ...pick("activity:distinct", "activity", [.5, .5]), entityId: "another-place" };
  const plan = negotiate(people, [dining, fixed[1], fixed[2], repeated, alternative]);
  assert.ok(plan.picks.includes("activity:distinct"));
  assert.ok(!plan.picks.includes("activity:shared"));
  assert.equal(plan.combinations, 1);
  assert.throws(() => negotiate(people, [dining, fixed[1], fixed[2], repeated]), /distinct entities/);
});
test("average-first comparison uses the highest minimum for tied group averages", () => {
  const candidates = [...fixed, pick("unbalanced", "activity", [1, .2]), pick("balanced", "activity", [.6, .6])];
  const forward = negotiate(people, candidates);
  const backward = negotiate(people.slice().reverse(), candidates.slice().reverse());
  assert.equal(forward.baselineMinimum, backward.baselineMinimum);
  assert.ok(Math.abs(forward.minimum - forward.baselineMinimum) < 1e-10);
});
test("duplicate identities cannot silently inflate attendee or Borda votes", () => {
  assert.throws(() => negotiate([people[0], people[0]], fixed), /Attendees must be unique/);
  assert.throws(() => negotiate(people, [...fixed, fixed[0]]), /Candidate IDs must be unique/);
});
