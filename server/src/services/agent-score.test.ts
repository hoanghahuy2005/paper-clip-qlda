import { describe, expect, it } from "vitest";
import { summarizeAgentScore } from "./agent-score.js";

describe("agent task scoring", () => {
  it("reports efficiency against 100 available points per completed task", () => {
    expect(summarizeAgentScore(3, 60)).toEqual({ pointsEarned: 300, pointsDeducted: 60, netPoints: 240, efficiencyPercent: 80 });
  });

  it("distinguishes zero efficiency from no completed tasks", () => {
    expect(summarizeAgentScore(1, 100).efficiencyPercent).toBe(0);
    expect(summarizeAgentScore(0, 0).efficiencyPercent).toBeNull();
  });
});
