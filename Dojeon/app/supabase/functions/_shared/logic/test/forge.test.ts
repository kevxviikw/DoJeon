import { test } from "node:test";
import assert from "node:assert/strict";
import { assessFeasibility, checkDeliverable } from "../forge.ts";

test("checkDeliverable rejects a vague activity", () => {
  const r = checkDeliverable("work on my portfolio");
  assert.equal(r.checkable, false);
});

test("checkDeliverable accepts a concrete, countable deliverable", () => {
  const r = checkDeliverable("publish three completed case studies");
  assert.equal(r.checkable, true);
});

test("checkDeliverable rejects an empty goal", () => {
  const r = checkDeliverable("   ");
  assert.equal(r.checkable, false);
});

test("checkDeliverable accepts a vague verb when a count/finish word is also present", () => {
  const r = checkDeliverable("work on and ship 2 features");
  assert.equal(r.checkable, true);
});

test("assessFeasibility: everything fits", () => {
  const result = assessFeasibility(
    { minimum: { hours: 10 }, target: { hours: 20 }, stretch: { hours: 30 } },
    30,
    2 // 60 hours capacity
  );
  assert.equal(result.feasible.minimum, true);
  assert.equal(result.feasible.target, true);
  assert.equal(result.feasible.stretch, true);
  assert.equal(result.tightestFeasibleTier, "stretch");
  assert.equal(result.tradeoffs.length, 0);
});

test("assessFeasibility: only minimum fits, proposes tradeoffs", () => {
  const result = assessFeasibility(
    { minimum: { hours: 10 }, target: { hours: 40 }, stretch: { hours: 80 } },
    10,
    1 // 10 hours capacity
  );
  assert.equal(result.feasible.minimum, true);
  assert.equal(result.feasible.target, false);
  assert.equal(result.feasible.stretch, false);
  assert.equal(result.tightestFeasibleTier, "minimum");
  assert.equal(result.tradeoffs.length, 0); // minimum fits, so no forced tradeoff
});

test("assessFeasibility: nothing fits, even Minimum -- real tradeoffs proposed, not a silent plan", () => {
  const result = assessFeasibility(
    { minimum: { hours: 100 }, target: { hours: 150 }, stretch: { hours: 200 } },
    5,
    1 // 5 hours capacity
  );
  assert.equal(result.feasible.minimum, false);
  assert.equal(result.tightestFeasibleTier, null);
  assert.ok(result.tradeoffs.some((t) => t.kind === "extend_deadline"));
  assert.ok(result.tradeoffs.some((t) => t.kind === "cut_scope"));
  assert.ok(result.tradeoffs.some((t) => t.kind === "increase_daily_capacity"));
});
