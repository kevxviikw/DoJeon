import { test } from "node:test";
import assert from "node:assert/strict";
import { checkRemoval } from "../removal.ts";

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
