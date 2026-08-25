import { describe, expect, it } from "vitest";
import { resolveSelection, selectionUrl } from "./urlState";

const tables = [
  {
    id: "core/action",
    collectionKey: "starforged",
    ruleset: "Starforged",
  },
  {
    id: "core/action",
    collectionKey: "sundered_isles",
    ruleset: "Sundered Isles",
  },
  {
    id: "settlements/name",
    collectionKey: "sundered_isles",
    ruleset: "Sundered Isles",
  },
];

describe("URL table selection", () => {
  it("uses the URL collection before resolving a duplicate table id", () => {
    const selected = resolveSelection(
      "?collection=sundered_isles&table=core%2Faction",
      tables,
      "starforged",
      "core/action",
    );

    expect(selected.collectionKey).toBe("sundered_isles");
    expect(selected.table).toBe(tables[1]);
  });

  it("uses the saved collection to disambiguate table-only links", () => {
    const selected = resolveSelection(
      "?table=core%2Faction",
      tables,
      "sundered_isles",
      "settlements/name",
    );

    expect(selected.collectionKey).toBe("sundered_isles");
    expect(selected.table).toBe(tables[1]);
  });

  it("keeps table-only links working across a saved collection", () => {
    const selected = resolveSelection(
      "?table=settlements%2Fname",
      tables,
      "starforged",
      "core/action",
    );

    expect(selected.collectionKey).toBe("sundered_isles");
    expect(selected.table).toBe(tables[2]);
  });

  it("writes collection and table without discarding other URL state", () => {
    expect(
      selectionUrl(
        "https://example.test/app/?ref=manual#results",
        "sundered_isles",
        "settlements/name",
      ),
    ).toBe(
      "/app/?ref=manual&collection=sundered_isles&table=settlements%2Fname#results",
    );
  });
});
