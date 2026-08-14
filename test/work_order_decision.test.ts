import assert from "node:assert/strict";
import test from "node:test";
import { decideWorkOrderUpdate } from "../src/work_order_decision.js";

test("an awaiting work order accepts the model's technician follow-up decision", () => {
  const result = decideWorkOrderUpdate("awaiting_review", {
    summary: "The disconnect appears open and needs an on-site check.",
    proposedDispatchStatus: "technician_follow_up",
    technicianFollowUp: "Confirm disconnect voltage before restarting the unit.",
  });

  assert.deepEqual(result, {
    dispatchStatus: "technician_follow_up",
    technicianFollowUp: "Confirm disconnect voltage before restarting the unit.",
  });
});

test("an already dispatched work order keeps its status", () => {
  const result = decideWorkOrderUpdate("dispatched", {
    summary: "A second photo would help confirm the panel condition.",
    proposedDispatchStatus: "awaiting_review",
    technicianFollowUp: "Photograph the panel label on arrival.",
  });

  assert.equal(result.dispatchStatus, "dispatched");
});
