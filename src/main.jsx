import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parse } from 'yaml';
import { getTables, rollTable, resultText, favouriteKey } from './oracle.js';
import './style.css';

const ROOT = 'https://raw.githubusercontent.com/rsek/datasworn/main/source_data';
const FILES = { classic: ['action_and_theme','character','name','place','settlement','turning_point'], delve: ['character','combat_event','feature','monstrosity','site_name','site_nature','threat','trap'], starforged: ['campaign_launch','characters','core','creatures','derelicts','factions','location_themes','misc','planet_types','planets','settlements','space','starships','vaults'], sundered_isles: ['caves','character_creation','characters','core','encounters','factions','islands','misc','other','overland','plunder','ruins','sailing_ships','seafaring','settlements','shipwrecks','treasures','weather'] };
const COLLECTIONS = { classic: 'Ironsworn', delve: 'Delve', starforged: 'Starforged', sundered_isles: 'Sundered Isles' };
const fallback = { oracles: { overland: { name: 'Overland', contents: { regions: { name: 'Overland Regions', rows: [{ min: 1, max: 20, text: 'Coastal waters' }, { min: 21, max: 40, text: 'Dense forest' }, { min: 41, max: 60, text: 'Open plains' }, { min: 61, max: 80, text: 'Mountain pass' }, { min: 81, max: 100, text: 'Ruined settlement' }] } } } } }; 
const saved = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };

function App() {
  const [tables, setTables] = useState(() => getTables(fallback));
  const [selected, setSelected] = useState(() => saved('datasworn.selected') ?? 'overland/regions');
  const [selectedCollection, setSelectedCollection] = useState(() => saved('datasworn.collection') ?? 'Ironsworn');
  const [favourites, setFavourites] = useState(() => saved('datasworn.favourites') ?? []);
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.allSettled(Object.entries(FILES).flatMap(([r, files]) => files.map(file => fetch(`${ROOT}/${r}/oracles/${file}.yaml`).then(res => res.ok ? res.text() : '').then(text => text ? getTables(parse(text)).map(t => ({ ...t, ruleset: COLLECTIONS[r] })) : []))))
      .then(results => { const loaded = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value); if (loaded.length) setTables(loaded); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => localStorage.setItem('datasworn.selected', JSON.stringify(selected)), [selected]);
  useEffect(() => localStorage.setItem('datasworn.collection', JSON.stringify(selectedCollection)), [selectedCollection]);
  useEffect(() => localStorage.setItem('datasworn.favourites', JSON.stringify(favourites)), [favourites]);
  const collections = [...new Set(tables.map(t => t.ruleset).filter(Boolean))];
  const collectionTables = tables.filter(t => t.ruleset === selectedCollection);
  const table = collectionTables.find(t => t.id === selected) ?? collectionTables[0] ?? tables[0];
  const rows = useMemo(() => table?.rows ?? [], [table]);
  const isFavourite = table && favourites.includes(favouriteKey(table));
  const choose = id => { const next = tables.find(t => t.id === id); setSelected(id); if (next?.ruleset) setSelectedCollection(next.ruleset); setLast(null); };
  const toggleFavourite = tableId => setFavourites(current => current.includes(tableId) ? current.filter(id => id !== tableId) : [...current, tableId]);
  const favouriteTables = favourites.map(id => tables.find(t => t.id === id)).filter(Boolean);
  const collectionName = table?.ruleset ?? selectedCollection;
  return <div className="layout"><aside><p className="eyebrow">QUICK ACCESS</p>{favouriteTables.length ? favouriteTables.map(t => <button className="favourite-link" key={t.id} onClick={() => choose(t.id)}>★ {t.label ?? t.name ?? t.tableId}</button>) : <p className="muted">Favourite tables appear here.</p>}<hr /><p className="eyebrow">COLLECTIONS</p>{collections.map(c => <p className="collection" key={c}>{c}</p>)}</aside><main>
    <header><p className="eyebrow">DATASWORN ORACLES</p><h1>Roll the unknown.</h1><p className="intro">Browse oracle tables across Ironsworn, Starforged, and Sundered Isles. Choose a table, roll d100, follow the prompt.</p></header>
    <section className="controls"><label>Collection<select value={collectionName} onChange={e => { setSelectedCollection(e.target.value); const first = tables.find(t => t.ruleset === e.target.value); if (first) choose(first.id); }}>{collections.map(collection => <option key={collection} value={collection}>{collection}</option>)}</select></label><label>Table<select value={table?.id ?? ''} onChange={e => choose(e.target.value)}>{collectionTables.map(t => <option key={t.id} value={t.id}>{t.label ?? t.name ?? t.tableId}</option>)}</select></label><button onClick={() => setLast(rollTable(table))}>Roll d100</button>{table && <button className="star" aria-label="Favourite table" onClick={() => toggleFavourite(favouriteKey(table))}>{isFavourite ? '★' : '☆'}</button>}</section>
    {last && <section className="result"><span className="roll">{last.roll}</span><div><p className="eyebrow">RESULT</p><h2>{last.result}</h2></div></section>}
    <section className="table-card"><div className="table-heading"><h2>{table?.name ?? 'Oracle table'}</h2><span>{loading ? 'Loading all rulesets…' : `${rows.length} results`}</span></div><div className="rows">{rows.map((r, i) => <div className="row" key={i}><span>{r.min ?? r.roll?.[0]}–{r.max ?? r.roll?.[1]}</span><p>{resultText(r)}</p></div>)}</div></section>
    <footer>Source: <a href="https://github.com/rsek/datasworn" target="_blank">rsek/datasworn</a>. Data loaded from GitHub at runtime.</footer>
  </main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
