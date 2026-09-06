import { test } from "node:test";
import assert from "node:assert/strict";
import { isFileVisibleToSquad, markSquadReviewed, removeEvidenceFile, submitEvidence } from "../proof.ts";

test("submitEvidence with a public file is labeled attached and visible", () => {
  const e = submitEvidence({ fileUrl: "https://x/file.jpg", filePrivate: false });
  assert.equal(e.trustLabel, "attached");
  assert.equal(isFileVisibleToSquad(e), true);
});

test("submitEvidence with filePrivate hides the file but keeps status submitted", () => {
  const e = submitEvidence({ fileUrl: "https://x/file.jpg", filePrivate: true });
  assert.equal(e.submitted, true);
  assert.equal(e.fileUrl, null);
  assert.equal(isFileVisibleToSquad(e), false);
});

test("submitEvidence with no file at all is self-reported", () => {
  const e = submitEvidence({ fileUrl: null, filePrivate: false });
  assert.equal(e.trustLabel, "self_reported");
});

test("markSquadReviewed upgrades the trust label only after real peer review", () => {
  const e = submitEvidence({ fileUrl: "https://x/file.jpg", filePrivate: false });
  const reviewed = markSquadReviewed(e);
  assert.equal(reviewed.trustLabel, "squad_reviewed");
});

test("removeEvidenceFile deletes the file but preserves the honest record", () => {
  const e = submitEvidence({ fileUrl: "https://x/file.jpg", filePrivate: false });
  const removed = removeEvidenceFile(e);
  assert.equal(removed.fileUrl, null);
  assert.equal(removed.fileRemoved, true);
  assert.equal(removed.submitted, true); // history isn't rewritten
});

test("removeEvidenceFile refuses to touch a never-submitted record", () => {
  assert.throws(() =>
    removeEvidenceFile({ submitted: false, trustLabel: "self_reported", filePrivate: false, fileUrl: null, fileRemoved: false })
  );
});
