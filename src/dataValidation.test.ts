import { describe, expect, it } from "vitest";
import { validateBundledData } from "./dataValidation";

describe("Datasworn validation", () => {
  it("accepts a ruleset with a collection and rollable table", () => {
    expect(
      validateBundledData({
        _id: "classic",
        datasworn_version: "0.0.10",
        type: "ruleset",
        oracles: {
          collection: {
            type: "oracle_collection",
            contents: {
              table: {
                type: "oracle_rollable",
                rows: [{ min: 1, max: 100, text: "Result" }],
              },
            },
          },
        },
      }).success,
    ).toBe(true);
  });

  it("rejects malformed collections, ranges, and rows without results", () => {
    const result = validateBundledData({
      _id: "classic",
      datasworn_version: "0.0.10",
      type: "ruleset",
      oracles: {
        collection: {
          type: "oracle_collection",
          contents: {
            table: { type: "oracle_rollable", rows: [{ min: 20, max: 1 }] },
          },
        },
      },
    });
    expect(result.success).toBe(false);
  });
});
