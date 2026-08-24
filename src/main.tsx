import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getTables,
  referenceExplanation,
  rollTable,
  resultParts,
  resultText,
  favouriteKey,
  tableDisplayName,
} from "./oracle";
import { validateBundledData } from "./dataValidation";
import type { OracleTable } from "./oracle";
import { resolveTableLink } from "./linkResolver";
import "./style.css";
import bundledData from "./data/index.json";

const parsedBundledData = Object.fromEntries(
  Object.entries(bundledData).flatMap(([key, data]) => {
    if (data === null) return [];
    const parsed = validateBundledData(data);
    if (!parsed.success)
      throw new Error(
        `Invalid bundled Datasworn data in ${key}: ${parsed.error.message}`,
      );
    return [[key, parsed.data]];
  }),
);

const COLLECTIONS = {
  classic: "Ironsworn",
  delve: "Delve",
  starforged: "Starforged",
  sundered_isles: "Sundered Isles",
};
const fallback = {
  oracles: {
    overland: {
      name: "Overland",
      contents: {
        regions: {
          name: "Overland Regions",
          rows: [
            { min: 1, max: 20, text: "Coastal waters" },
            { min: 21, max: 40, text: "Dense forest" },
            { min: 41, max: 60, text: "Open plains" },
            { min: 61, max: 80, text: "Mountain pass" },
            { min: 81, max: 100, text: "Ruined settlement" },
          ],
        },
      },
    },
  },
};
const saved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};

function App() {
  const [tables, setTables] = useState<OracleTable[]>(() =>
    getTables(fallback),
  );
  const [selected, setSelected] = useState<string>(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("table");
    return fromUrl ?? saved("datasworn.selected") ?? "overland/regions";
  });
  const [selectedCollection, setSelectedCollection] = useState<string>(
    () => saved("datasworn.collection") ?? "Ironsworn",
  );
  const [favourites, setFavourites] = useState<string[]>(
    () => saved("datasworn.favourites") ?? [],
  );
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const loaded = Object.entries(parsedBundledData).flatMap(([key, data]) => {
      const ruleset = Object.keys(COLLECTIONS).find((name) =>
        key.startsWith(`${name}-`),
      );
      return getTables(data).map((t) => ({
        ...t,
        sourceKey: key.slice(`${ruleset}-`.length),
        ruleset: COLLECTIONS[ruleset],
      }));
    });
    if (loaded.length) setTables(loaded);
    setLoading(false);
  }, []);
  useEffect(
    () => localStorage.setItem("datasworn.selected", JSON.stringify(selected)),
    [selected],
  );
  useEffect(() => {
    const onPopState = () => {
      const id = new URLSearchParams(window.location.search).get("table");
      if (!id) return;
      const next = tables.find((item) => item.id === id);
      if (!next) return;
      setSelected(id);
      if (next.ruleset) setSelectedCollection(next.ruleset);
      setLast(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tables]);
  useEffect(
    () =>
      localStorage.setItem(
        "datasworn.collection",
        JSON.stringify(selectedCollection),
      ),
    [selectedCollection],
  );
  useEffect(
    () =>
      localStorage.setItem("datasworn.favourites", JSON.stringify(favourites)),
    [favourites],
  );
  const collections = [
    ...new Set(tables.map((t) => t.ruleset).filter(Boolean)),
  ];
  const collectionTables = tables.filter(
    (t) => t.ruleset === selectedCollection,
  );
  const table =
    collectionTables.find((t) => t.id === selected) ??
    collectionTables[0] ??
    tables[0];
  const tableById = (id: string) => resolveTableLink(id, tables);
  const rows = useMemo(() => table?.rows ?? [], [table]);
  const isFavourite = table && favourites.includes(favouriteKey(table));
  const choose = (id: string) => {
    const next = tables.find((t) => t.id === id);
    if (!next) return;
    window.history.pushState({}, "", `?table=${encodeURIComponent(id)}`);
    setSelected(id);
    if (next?.ruleset) setSelectedCollection(next.ruleset);
    setLast(null);
  };
  const toggleFavourite = (tableId: string) =>
    setFavourites((current) =>
      current.includes(tableId)
        ? current.filter((id) => id !== tableId)
        : [...current, tableId],
    );
  const favouriteTables = favourites
    .map((id) => tables.find((t) => t.id === id))
    .filter(Boolean);
  const collectionName = table?.ruleset ?? selectedCollection;
  return (
    <div className="layout">
      <aside>
        <p className="eyebrow">QUICK ACCESS</p>
        {favouriteTables.length ? (
          <div className="quick-access">
            {favouriteTables.map((t) => (
              <button
                className="favourite-link"
                key={t.id}
                onClick={() => choose(t.id)}
              >
                ★ {tableDisplayName(t)}
              </button>
            ))}
          </div>
        ) : (
          <p className="muted">Favourite tables appear here.</p>
        )}
        <hr />
        <p className="eyebrow">COLLECTIONS</p>
        {collections.map((c) => (
          <p className="collection" key={c}>
            {c}
          </p>
        ))}
      </aside>
      <main>
        <header>
          <p className="eyebrow">DATASWORN ORACLES</p>
          <h1>Roll the unknown.</h1>
          <p className="intro">
            Browse oracle tables across Ironsworn, Starforged, and Sundered
            Isles. Choose a table, roll d100, follow the prompt.
          </p>
        </header>
        <section className="controls">
          <label>
            Collection
            <select
              value={collectionName}
              onChange={(e) => {
                setSelectedCollection(e.target.value);
                const first = tables.find((t) => t.ruleset === e.target.value);
                if (first) choose(first.id);
              }}
            >
              {collections.map((collection) => (
                <option key={collection} value={collection}>
                  {collection}
                </option>
              ))}
            </select>
          </label>
          <label>
            Table
            <select
              value={table?.id ?? ""}
              onChange={(e) => choose(e.target.value)}
            >
              {collectionTables.map((t) => (
                <option key={t.id} value={t.id}>
                  {tableDisplayName(t)}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              const rolled = rollTable(table);
              const row =
                table?.rows.find((r) => rolled.result === resultText(r)) ??
                table?.rows.find(
                  (r) =>
                    Number(r.min) <= rolled.roll &&
                    Number(r.max) >= rolled.roll,
                );
              setLast({ ...rolled, row });
            }}
          >
            Roll d100
          </button>
          {table && (
            <button
              className="star"
              aria-label="Favourite table"
              onClick={() => toggleFavourite(favouriteKey(table))}
            >
              {isFavourite ? "★" : "☆"}
            </button>
          )}
        </section>
        {last && (
          <section className="result">
            <span className="roll">{last.roll}</span>
            <div>
              <p className="eyebrow">RESULT</p>
              <h2>
                {resultParts(last.row).map((part, i) =>
                  part.type === "reference" ? (
                    <span className="book-reference" key={i}>
                      <span className="book-reference-label">
                        Source-book lookup
                      </span>
                      <span>{part.value}</span>
                      <span className="book-reference-help">
                        {referenceExplanation(part.value)}
                      </span>
                    </span>
                  ) : part.type === "link" ? (
                    tableById(part.id) ? (
                      <button
                        className="inline-link"
                        key={i}
                        onClick={() => choose(tableById(part.id).id)}
                        title="Open linked oracle table"
                      >
                        {resultText({ text: part.value })}{" "}
                        <span className="link-mark">↗</span>
                      </button>
                    ) : (
                      <span
                        className="unresolved-link"
                        key={i}
                        title="This linked oracle table is not included in the bundled data"
                      >
                        {resultText({ text: part.value })}{" "}
                        <span className="link-mark">⚠</span>
                      </span>
                    )
                  ) : (
                    <React.Fragment key={i}>
                      {resultText({ text: part.value })}
                    </React.Fragment>
                  ),
                )}
              </h2>
            </div>
          </section>
        )}
        <section className="table-card">
          <div className="table-heading">
            <h2>{tableDisplayName(table)}</h2>
            <span>
              {loading ? "Loading all rulesets…" : `${rows.length} results`}
            </span>
          </div>
          <div className="rows">
            {rows.map((r, i) => (
              <div className="row" key={i}>
                <span>
                  {r.min ?? r.roll?.[0]}–{r.max ?? r.roll?.[1]}
                </span>
                <p>
                  {resultParts(r).map((part, i) =>
                    part.type === "reference" ? (
                      <span
                        className="book-reference book-reference-compact"
                        key={i}
                        title="Source-book reference"
                      >
                        {part.value}
                      </span>
                    ) : part.type === "link" ? (
                      tableById(part.id) ? (
                        <button
                          className="inline-link"
                          key={i}
                          onClick={() => choose(tableById(part.id).id)}
                          title="Open linked oracle table"
                        >
                          {resultText({ text: part.value })}{" "}
                          <span className="link-mark">↗</span>
                        </button>
                      ) : (
                        <span
                          className="unresolved-link"
                          key={i}
                          title="This linked oracle table is not included in the bundled data"
                        >
                          {resultText({ text: part.value })}{" "}
                          <span className="link-mark">⚠</span>
                        </span>
                      )
                    ) : (
                      <React.Fragment key={i}>
                        {resultText({ text: part.value })}
                      </React.Fragment>
                    ),
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
        <footer>
          Source:{" "}
          <a href="https://github.com/rsek/datasworn" target="_blank">
            rsek/datasworn
          </a>
          . Datasworn data bundled with this app.
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
