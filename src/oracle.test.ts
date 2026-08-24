import { describe, expect, it } from "vitest";
import {
  getTables,
  referenceExplanation,
  rollTable,
  resultParts,
  resultText,
} from "./oracle";

describe("Datasworn oracle helpers", () => {
  const data = {
    oracles: {
      overland: {
        contents: {
          regions: {
            name: "Regions",
            rows: [{ min: 1, max: 20, text: "Forest", text2: "Trees" }],
          },
          nested: {
            contents: {
              details: { rows: [{ min: 1, max: 100, text: "Detail" }] },
            },
          },
          ignored: { name: "No rows" },
        },
      },
    },
  };
  it("discovers tables across oracle collections", () => {
    expect(getTables(data)).toHaveLength(2);
    expect(getTables(data)[0].id).toBe("overland/contents/regions");
    expect(getTables(data)[0].label).toBe("Regions");
  });
  it("rolls within inclusive ranges", () => {
    const result = rollTable(getTables(data)[0], () => 0);
    expect(result.roll).toBe(1);
    expect(result.result).toBe("Forest - Trees");
  });
  it("returns a useful fallback when no range matches", () => {
    expect(rollTable({ rows: [] }, () => 0).result).toBe(
      "No result for this roll.",
    );
  });
  it("resolves YAML merge aliases in table rows", () => {
    expect(resultText({ "<<": { text: "Known waters" } })).toBe("Known waters");
  });
  it("keeps internal link targets in result parts", () => {
    expect(
      resultParts({
        text: "[Sailing Ships](id:sundered_isles/collections/oracles/ships)",
      }),
    ).toEqual([
      {
        type: "link",
        value: "Sailing Ships",
        id: "sundered_isles/collections/oracles/ships",
      },
    ]);
  });
  it("formats unresolved internal links without losing their target", () => {
    expect(resultParts({ text: "[Missing](id:missing/table)" })).toEqual([
      { type: "link", value: "Missing", id: "missing/table" },
    ]);
  });
  it("recognises book and page references as non-link references", () => {
    expect(resultParts({ text: "Sheltered in a > Cave; pg XX" })).toEqual([
      { type: "text", value: "Sheltered in a " },
      { type: "reference", value: "Cave; pg XX" },
    ]);
  });
  it("explains known and unknown book/page references without inventing details", () => {
    expect(referenceExplanation("Cave; pg XX")).toBe(
      "Source-book lookup: Cave; pg XX. Consult the source book at page unknown for details.",
    );
    expect(referenceExplanation("Treasure; pg 215 (large repository)")).toBe(
      "Source-book lookup: Treasure; pg 215 (large repository). Consult the source book at page 215 for details.",
    );
  });
  it("formats Datasworn markdown links and emphasis", () => {
    expect(
      resultText({
        text: "__Sails, ho!__ [Sailing Ships](id:sundered_isles/collections/oracles/ships)",
      }),
    ).toBe("Sails, ho! Sailing Ships");
  });
  it("formats nested/repeated roll instructions", () => {
    expect(resultText({ text: "Roll twice", rolls: 2 })).toBe("Roll twice");
  });
});
