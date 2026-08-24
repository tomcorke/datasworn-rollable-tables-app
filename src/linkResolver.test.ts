import { describe, expect, it } from "vitest";
import bundledData from "./data/index.json";
import { getTables, resultParts } from "./oracle";
import { resolveTableLink } from "./linkResolver";

const rulesets = { classic: 1, delve: 1, starforged: 1, sundered_isles: 1 };
const tables = Object.entries(bundledData).flatMap(([key, data]) => {
  const ruleset = Object.keys(rulesets).find((name) =>
    key.startsWith(`${name}-`),
  );
  return getTables(data).map((t) => ({
    ...t,
    sourceKey: key.slice(`${ruleset}-`.length),
    ruleset,
  }));
});
const references = tables.flatMap((table) =>
  table.rows.flatMap((row) =>
    resultParts(row)
      .filter((part) => part.type === "link")
      .map((part) => ({ from: table.id, ...part })),
  ),
);
const nonTableTargets = /\/(atlas|assets|site_themes)\//;
const tableReferences = references.filter(
  (reference) => !nonTableTargets.test(reference.id),
);
const unavailableCollections = new Set(["ruins"]);
const unresolved = tableReferences.filter(
  (reference) => !resolveTableLink(reference.id, tables),
);

describe("bundled Datasworn links", () => {
  it("finds references in every table", () =>
    expect(references.length).toBeGreaterThan(0));
  it("resolves every reference whose target data is bundled", () => {
    const missing = unresolved.filter(
      ({ id }) => !unavailableCollections.has(id.split("/").at(-1)),
    );
    expect(
      missing,
      missing
        .map(({ value, id, from }) => `${value}: ${id} (from ${from})`)
        .join("\n"),
    ).toEqual([]);
  });
  it("does not cross-resolve rulesets with the same short link", () => {
    const sundered = {
      id: "sailing_ships/contents/size",
      sourceKey: "sailing_ships",
      ruleset: "sundered_isles",
      tableId: "size",
    };
    const starforged = {
      id: "starships/contents/size",
      sourceKey: "starships",
      ruleset: "starforged",
      tableId: "size",
    };
    expect(
      resolveTableLink("sundered_isles/collections/oracles/ships", [
        sundered,
        starforged,
      ]),
    ).toBe(sundered);
  });
  it("reports non-table and unavailable references explicitly", () => {
    expect(
      references.filter((reference) => nonTableTargets.test(reference.id))
        .length,
    ).toBeGreaterThan(0);
    expect(unresolved.map((reference) => reference.id)).toContain(
      "sundered_isles/collections/oracles/ruins",
    );
  });
});
