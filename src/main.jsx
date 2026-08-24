import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { parse } from 'yaml';
import { getTables, rollTable, resultText } from './oracle.js';
import './style.css';

const DATA_URL = 'https://raw.githubusercontent.com/rsek/datasworn/main/source_data/sundered_isles/oracles/overland.yaml';
const fallback = { oracles: { overland: { contents: { regions: { name: 'Overland Regions', oracle_type: 'table_text2', rows: [
  {min:1,max:20,text:'Coastal waters'}, {min:21,max:40,text:'Dense forest'}, {min:41,max:60,text:'Open plains'}, {min:61,max:80,text:'Mountain pass'}, {min:81,max:100,text:'Ruined settlement'}
] } } } } };

const tablesFromData = getTables;
function App() {
  const [tables, setTables] = useState(() => tablesFromData(fallback));
  const [selected, setSelected] = useState(0);
  const [last, setLast] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch(DATA_URL).then(r => r.text()).then(t => { const loaded = tablesFromData(parse(t)); if (loaded.length) setTables(loaded); }).catch(() => {}).finally(() => setLoading(false)); }, []);
  const table = tables[selected];
  const title = table?.name ?? 'Oracle table';
  const rows = useMemo(() => table?.rows ?? [], [table]);
  return <main>
    <header><p className="eyebrow">DATASWORN ORACLES</p><h1>Roll the unknown.</h1><p className="intro">Browse structured oracle tables from Sundered Isles. Choose a table, roll d100, follow the prompt.</p></header>
    <section className="controls"><label>Table<select value={selected} onChange={e => { setSelected(Number(e.target.value)); setLast(null); }}>{tables.map((t, i) => <option key={t.id} value={i}>{t.name ?? t.id}</option>)}</select></label><button onClick={() => setLast(rollTable(table))}>Roll d100</button></section>
    {last && <section className="result"><span className="roll">{last.roll}</span><div><p className="eyebrow">RESULT</p><h2>{last.result}</h2></div></section>}
    <section className="table-card"><div className="table-heading"><h2>{title}</h2><span>{loading ? 'Loading source data…' : `${rows.length} results`}</span></div><div className="rows">{rows.map((r, i) => <div className="row" key={i}><span>{r.min ?? r.roll?.[0]}–{r.max ?? r.roll?.[1]}</span><p>{resultText(r)}</p></div>)}</div></section>
    <footer>Source: <a href="https://github.com/rsek/datasworn" target="_blank">rsek/datasworn</a>. Data loaded from GitHub at runtime.</footer>
  </main>;
}
createRoot(document.getElementById('root')).render(<App />);
