import { test } from "node:test";
import assert from "node:assert/strict";
import { checkFlatRemoval, checkRemoval } from "../removal.ts";

test("missed days exactly at one third do NOT trigger removal (must exceed, not meet)", () => {
  const r = checkRemoval(10, 30); // exactly 1/3
  assert.equal(r.shouldRemove, false);
});

test("missed days just over one third trigger removal", () => {
  const r = checkRemoval(11, 30);
  assert.equal(r.shouldRemove, true);
});

test("solo missions never call this in practice, but the math is symmetric regardless of squad size", () => {
  const r = checkRemoval(0, 30);
  assert.equal(r.shouldRemove, false);
});

test("adjustable fraction threshold", () => {
  const lenient = checkRemoval(15, 30, 0.5); // exactly half, not over
  assert.equal(lenient.shouldRemove, false);
  const strict = checkRemoval(15, 30, 0.4);
  assert.equal(strict.shouldRemove, true);
});

test("rejects a non-positive mission duration", () => {
  assert.throws(() => checkRemoval(1, 0));
});

// Club presentation amendment (2026-09-15): flat 5-missed-day cap, used
// by squad-removal-sweep instead of the fraction above for now.
test("checkFlatRemoval: fewer than 5 missed days does not remove", () => {
  const r = checkFlatRemoval(4);
  assert.equal(r.shouldRemove, false);
});

test("checkFlatRemoval: exactly 5 missed days removes", () => {
  const r = checkFlatRemoval(5);
  assert.equal(r.shouldRemove, true);
});

test("checkFlatRemoval: threshold is adjustable", () => {
  const r = checkFlatRemoval(3, 3);
  assert.equal(r.shouldRemove, true);
});
