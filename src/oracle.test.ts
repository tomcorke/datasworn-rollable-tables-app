import { describe, expect, it } from "vitest";
import type { OracleTable } from "./oracle";
import {
  getTables,
  referenceExplanation,
  rowRange,
  rollCeiling,
  rollLabel,
  rollTable,
  resultParts,
  resultText,
  tableDisplayName,
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
  it("uses only string values for table display names", () => {
    expect(
      tableDisplayName({ label: { name: "Broken" } } as unknown as OracleTable),
    ).toBe("Oracle table");
    expect(tableDisplayName({ label: null })).toBe("Oracle table");
    expect(
      tableDisplayName({ label: ["Broken"] } as unknown as OracleTable),
    ).toBe("Oracle table");
    expect(tableDisplayName({ name: "Regions" })).toBe("Regions");
    expect(tableDisplayName({ tableId: "regions" })).toBe("regions");
  });
  it("ignores object and array names while discovering table labels", () => {
    const tables = getTables({
      oracles: {
        objectName: { name: { en: "Broken" }, rows: [] },
        arrayName: { name: ["Broken"], rows: [] },
        nullName: { name: null, rows: [{ min: 1, max: 100, text: "Result" }] },
      },
    });
    expect(tables.map((table) => table.label)).toEqual(["", "", ""]);
    expect(tables.map(tableDisplayName)).toEqual([
      "objectName",
      "arrayName",
      "nullName",
    ]);
  });
  it("preserves line breaks between multiline result fields", () => {
    expect(resultText({ text: "Forest", text2: "Trees\nHide nearby" })).toBe(
      "Forest\nTrees\nHide nearby",
    );
  });
  it("rolls within inclusive ranges", () => {
    const table = getTables(data)[0];
    const result = rollTable(table, () => 0);
    expect(result.roll).toBe(1);
    expect(result.result).toBe("Forest\nTrees");
    expect(result.row).toBe(table.rows[0]);
  });
  it("rolls the upper boundary of an explicit d10 table", () => {
    const table = {
      dice: "1d10",
      rows: [
        { min: 1, max: 9, text: "Lower" },
        { min: 10, max: 10, text: "Upper" },
      ],
    };
    expect(rollCeiling(table)).toBe(10);
    expect(rollLabel(table)).toBe("Roll d10");
    expect(rollTable(table, () => 0.999999)).toMatchObject({
      roll: 10,
      row: table.rows[1],
      result: "Upper",
    });
  });
  it("rolls the upper boundary of an explicit d20 table", () => {
    const table = {
      dice: "d20",
      rows: [
        { min: 1, max: 19, text: "Lower" },
        { min: 20, max: 20, text: "Upper" },
      ],
    };
    expect(rollCeiling(table)).toBe(20);
    expect(rollLabel(table)).toBe("Roll d20");
    expect(rollTable(table, () => 0.999999)).toMatchObject({
      roll: 20,
      row: table.rows[1],
      result: "Upper",
    });
  });
  it("uses the highest finite row maximum without declared dice", () => {
    const table = {
      rows: [
        { min: 1, max: 19, text: "Lower" },
        { min: 20, max: 20, text: "Upper" },
      ],
    };
    expect(rollCeiling(table)).toBe(20);
    expect(rollLabel(table)).toBe("Roll");
    expect(rollTable(table, () => 0.999999).row).toBe(table.rows[1]);
  });
  it("assigns ordinal ranges to wholly unnumbered tables", () => {
    const table = {
      rows: [{ text: "First" }, { text: "Second" }, { text: "Third" }],
    };
    expect(table.rows.map((_, index) => rowRange(table, index))).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
    expect(rollTable(table, () => 0).row).toBe(table.rows[0]);
    expect(rollTable(table, () => 0.999).row).toBe(table.rows[2]);
  });
  it("leaves missing ranges unavailable in mixed tables", () => {
    const table = {
      rows: [
        { min: 1, max: 100, text: "Available" },
        { min: null, max: null, text: "Unavailable" },
      ],
    };
    expect(rowRange(table, 0)).toEqual([1, 100]);
    expect(rowRange(table, 1)).toBeUndefined();
  });
  it("returns the exact matching row when result text is duplicated", () => {
    const table = {
      rows: [
        { min: 1, max: 50, text: "Same" },
        { min: 51, max: 100, text: "Same" },
      ],
    };
    expect(rollTable(table, () => 0.5).row).toBe(table.rows[1]);
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
