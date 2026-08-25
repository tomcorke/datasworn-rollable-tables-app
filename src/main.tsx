import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  getTables,
  rollLabel,
  rollTable,
  rowRange,
  favouriteKey,
  tableDisplayName,
  searchTables,
} from "./oracle";
import { validateBundledData } from "./dataValidation";
import type { OracleRow, OracleTable } from "./oracle";
import { ResultContent } from "./ResultContent";
import { resolveTableLink } from "./linkResolver";
import { resolveSelection, selectionUrl } from "./urlState";
import {
  getSavedTheme,
  getSystemTheme,
  persistTheme,
  resolveTheme,
} from "./theme";
import type { Theme } from "./theme";
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

const COLLECTIONS: Record<string, string> = {
  classic: "Ironsworn",
  delve: "Delve",
  starforged: "Starforged",
  sundered_isles: "Sundered Isles",
};
const collectionKey = (savedCollection: string | null) =>
  Object.keys(COLLECTIONS).find(
    (key) => key === savedCollection || COLLECTIONS[key] === savedCollection,
  );
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
type RollResult = { roll: number; row?: OracleRow };
type HistoryEntry = RollResult & { sequence: number; table: OracleTable };

const saved = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const save = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the app usable when storage is unavailable.
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
  const [selectedSource, setSelectedSource] = useState<string>();
  const [selectedCollection, setSelectedCollection] = useState<string>(
    () => collectionKey(saved("datasworn.collection")) ?? "classic",
  );
  const [favourites, setFavourites] = useState<string[]>(
    () => saved("datasworn.favourites") ?? [],
  );
  const [last, setLast] = useState<RollResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tableQuery, setTableQuery] = useState("");
  const [historyVisible, setHistoryVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [explicitTheme, setExplicitTheme] = useState(
    () => getSavedTheme() !== null,
  );
  const [theme, setTheme] = useState<Theme>(() =>
    resolveTheme(getSavedTheme(), getSystemTheme() === "dark"),
  );
  const chooseTheme = (nextTheme: Theme) => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    persistTheme(nextTheme);
    setTheme(nextTheme);
    setExplicitTheme(true);
  };
  useEffect(() => {
    if (explicitTheme) return;
    try {
      const preference = window.matchMedia("(prefers-color-scheme: dark)");
      const followSystem = (event: MediaQueryListEvent) => {
        const nextTheme = event.matches ? "dark" : "light";
        document.documentElement.dataset.theme = nextTheme;
        document.documentElement.style.colorScheme = nextTheme;
        setTheme(nextTheme);
      };
      preference.addEventListener("change", followSystem);
      return () => preference.removeEventListener("change", followSystem);
    } catch {
      return;
    }
  }, [explicitTheme]);
  useEffect(() => {
    const loaded = Object.entries(parsedBundledData).flatMap(([key, data]) => {
      const ruleset = Object.keys(COLLECTIONS).find((name) =>
        key.startsWith(`${name}-`),
      );
      return getTables(data).map((t) => ({
        ...t,
        collectionKey: ruleset,
        sourceKey: key.slice(`${ruleset}-`.length),
        ruleset: COLLECTIONS[ruleset],
      }));
    });
    if (loaded.length) {
      const selection = resolveSelection(
        window.location.search,
        loaded,
        collectionKey(saved("datasworn.collection")),
        saved("datasworn.selected"),
      );
      setTables(loaded);
      setSelectedCollection(selection.collectionKey);
      setSelected(selection.table?.id ?? "");
      setSelectedSource(selection.table?.sourceKey);
      window.history.replaceState(
        {
          ...window.history.state,
          collection: selection.collectionKey,
          table: selection.table?.id,
        },
        "",
      );
    }
    setLoading(false);
  }, []);
  useEffect(() => save("datasworn.selected", selected), [selected]);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const selection = resolveSelection(
        window.location.search,
        tables,
        event.state?.collection ?? selectedCollection,
        event.state?.table ?? selected,
      );
      if (!selection.table) return;
      setSelected(selection.table.id ?? "");
      setSelectedSource(selection.table.sourceKey);
      setSelectedCollection(selection.collectionKey);
      setLast(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [tables, selected, selectedCollection]);
  useEffect(
    () => save("datasworn.collection", selectedCollection),
    [selectedCollection],
  );
  useEffect(() => save("datasworn.favourites", favourites), [favourites]);
  const collections = [
    ...new Set(tables.map((t) => t.collectionKey).filter(Boolean)),
  ];
  const collectionTables = tables.filter(
    (t) => t.collectionKey === selectedCollection,
  );
  const matchingTables = searchTables(collectionTables, tableQuery);
  const table =
    collectionTables.find(
      (t) =>
        t.id === selected &&
        (!selectedSource || t.sourceKey === selectedSource),
    ) ??
    collectionTables[0] ??
    tables[0];
  const tableById = (id: string) => resolveTableLink(id, tables);
  const rows = useMemo(() => table?.rows ?? [], [table]);
  const isFavourite = table && favourites.includes(favouriteKey(table));
  const choose = (next: OracleTable) => {
    const id = next.id ?? "";
    window.history.pushState(
      { collection: next.collectionKey, table: id },
      "",
      selectionUrl(window.location.href, next.collectionKey ?? "", id),
    );
    setSelected(id);
    setSelectedSource(next.sourceKey);
    if (next.collectionKey) setSelectedCollection(next.collectionKey);
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
  const collectionName = table?.collectionKey ?? selectedCollection;
  return (
    <div className={`layout${historyVisible ? "" : " history-hidden"}`}>
      <aside>
        <p className="eyebrow">QUICK ACCESS</p>
        {favouriteTables.length ? (
          <div className="quick-access">
            {favouriteTables.map((t) => (
              <button
                className="favourite-link"
                key={t.id}
                onClick={() => choose(t)}
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
        {collections.map((collection) => (
          <button
            className="collection"
            key={collection}
            aria-current={
              collection === selectedCollection ? "true" : undefined
            }
            onClick={() => {
              const first = tables.find((t) => t.collectionKey === collection);
              if (first) choose(first);
            }}
          >
            {COLLECTIONS[collection] ?? collection}
          </button>
        ))}
      </aside>
      <main>
        <header>
          <button
            className="theme-toggle"
            type="button"
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            onClick={() => chooseTheme(theme === "light" ? "dark" : "light")}
          >
            <span aria-hidden="true">{theme === "light" ? "☀" : "☾"}</span>
          </button>
          <p className="eyebrow">DATASWORN ORACLES</p>
          <h1>Datasworn Roll Tables</h1>
          <p className="intro">
            Browse oracle tables across Ironsworn, Starforged, and Sundered
            Isles.
          </p>
        </header>
        <section className="controls">
          <label>
            Collection
            <select
              value={collectionName}
              onChange={(e) => {
                const first = tables.find(
                  (t) => t.collectionKey === e.target.value,
                );
                if (first) choose(first);
              }}
            >
              {collections.map((collection) => (
                <option key={collection} value={collection}>
                  {COLLECTIONS[collection] ?? collection}
                </option>
              ))}
            </select>
          </label>
          <label>
            Table
            <span className="table-search">
              <input
                type="search"
                value={tableQuery}
                placeholder="Search tables"
                aria-label="Search tables in selected collection"
                onChange={(event) => setTableQuery(event.target.value)}
              />
              <output className="match-count" aria-live="polite">
                <span aria-hidden="true">
                  {matchingTables.length === 1
                    ? "1 match"
                    : `${matchingTables.length} matches`}
                </span>
                <span className="sr-only">
                  {matchingTables.length === 1
                    ? "1 matching table"
                    : `${matchingTables.length} matching tables`}
                </span>
              </output>
            </span>
            <select
              aria-label="Table"
              value={matchingTables.includes(table) ? (table?.id ?? "") : ""}
              onChange={(e) => {
                const next = matchingTables.find(
                  (t) => t.id === e.target.value,
                );
                if (next) choose(next);
              }}
            >
              {matchingTables.length ? (
                !matchingTables.includes(table) && (
                  <option value="" disabled>
                    Choose a matching table
                  </option>
                )
              ) : (
                <option value="" disabled>
                  No matching tables
                </option>
              )}
              {matchingTables.map((t) => (
                <option key={`${t.sourceKey}/${t.id}`} value={t.id}>
                  {tableDisplayName(t)}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              if (!table) return;
              const rolled = rollTable(table);
              setLast(rolled);
              setHistory((current) => [
                {
                  sequence: current[0]?.sequence + 1 || 1,
                  table,
                  roll: rolled.roll,
                  row: rolled.row,
                },
                ...current,
              ]);
            }}
          >
            {rollLabel(table)}
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
          <button
            className="history-toggle"
            aria-controls="roll-history"
            aria-expanded={historyVisible}
            onClick={() => setHistoryVisible((visible) => !visible)}
          >
            {historyVisible ? "Hide history" : "Show history"}
          </button>
        </section>
        {last && (
          <section className="result">
            <span className="roll">{last.roll}</span>
            <div>
              <p className="eyebrow">RESULT</p>
              <h2>
                <ResultContent
                  row={last.row}
                  resolveTable={tableById}
                  onChoose={choose}
                />
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
            {rows.map((row, index) => {
              const range = rowRange(table, index);
              return (
                <div className="row" key={index}>
                  <span>
                    {range
                      ? range[0] === range[1]
                        ? range[0]
                        : `${range[0]}–${range[1]}`
                      : "–"}
                  </span>
                  <p>
                    <ResultContent
                      row={row}
                      resolveTable={tableById}
                      onChoose={choose}
                      compactReferences
                    />
                  </p>
                </div>
              );
            })}
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
      {historyVisible && (
        <aside className="history" id="roll-history">
          <div className="history-heading">
            <p className="eyebrow">ROLL HISTORY</p>
            <button
              className="history-clear"
              type="button"
              disabled={!history.length}
              onClick={() => setHistory([])}
            >
              Clear
            </button>
          </div>
          {history.length ? (
            history.map((entry) => (
              <article className="history-entry" key={entry.sequence}>
                <div className="history-entry-heading">
                  <button
                    className="history-table-link"
                    onClick={() => choose(entry.table)}
                  >
                    {entry.table.ruleset} / {tableDisplayName(entry.table)}
                  </button>
                  <button
                    className="history-delete"
                    type="button"
                    aria-label={`Delete ${tableDisplayName(entry.table)} roll from history`}
                    onClick={() =>
                      setHistory((current) =>
                        current.filter(
                          (item) => item.sequence !== entry.sequence,
                        ),
                      )
                    }
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="history-result">
                  <span className="history-roll">{entry.roll}</span>
                  <p>
                    <ResultContent
                      row={entry.row}
                      resolveTable={tableById}
                      onChoose={choose}
                      compactReferences
                    />
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="muted">Rolls appear here.</p>
          )}
        </aside>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
