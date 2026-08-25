import assert from "node:assert/strict";
import test from "node:test";
import { describeCompatibleEvent, parseEvent } from "./compatibility.js";

test("parses a known Created event", () => {
  const event = parseEvent({ type: "Created", data: { id: "item-123" } });

  assert.deepEqual(event, {
    type: "Created",
    data: { id: "item-123" },
  });
  assert.equal(describeCompatibleEvent(event), "created item-123");
});

test("preserves a known Deleted reason", () => {
  const event = parseEvent({
    type: "Deleted",
    data: { id: "item-123", reason: "retention policy" },
  });

  assert.deepEqual(event, {
    type: "Deleted",
    data: { id: "item-123", reason: "retention policy" },
  });
  assert.equal(
    describeCompatibleEvent(event),
    "deleted item-123: retention policy",
  );
});

test("maps a future variant to Unknown", () => {
  const event = parseEvent({
    type: "ArchivedInTheFuture",
    data: { id: "item-123" },
  });

  assert.deepEqual(event, {
    type: "Unknown",
    originalType: "ArchivedInTheFuture",
    data: { id: "item-123" },
  });
  assert.equal(
    describeCompatibleEvent(event),
    "unsupported event: ArchivedInTheFuture",
  );
});

test("maps malformed input to Unknown", () => {
  const event = parseEvent({ type: "Deleted", data: { id: "item-123" } });

  assert.deepEqual(event, {
    type: "Unknown",
    originalType: "Deleted",
    data: { id: "item-123" },
  });
});
