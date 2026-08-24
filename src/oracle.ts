export type OracleRow = {
  min?: number | string | null;
  max?: number | string | null;
  roll?: number[];
  text?: string;
  text2?: string;
  text3?: string;
  result?: string;
  description?: string;
  [key: string]: unknown;
};
export type OracleTable = {
  id?: string;
  tableId?: string;
  label?: string;
  name?: string;
  rows?: OracleRow[];
  ruleset?: string;
  sourceKey?: string;
  dice?: string;
  [key: string]: unknown;
};

function resolve(value: unknown): any {
  if (Array.isArray(value)) return value.map(resolve);
  if (!value || typeof value !== "object") return value;
  const merged = value["<<"];
  const bases = Array.isArray(merged) ? merged : merged ? [merged] : [];
  return {
    ...Object.assign({}, ...bases.map(resolve)),
    ...Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== "<<")
        .map(([key, child]) => [key, resolve(child)]),
    ),
  };
}
function walk(
  value: any,
  path: string[] = [],
  labels: string[] = [],
): OracleTable[] {
  if (!value || typeof value !== "object") return [];
  const found = [];
  const name = typeof value.name === "string" ? value.name : undefined;
  if (Array.isArray(value.rows))
    found.push({
      id: path.join("/"),
      tableId: path.at(-1),
      label: [...labels, name]
        .filter(Boolean)
        .filter(
          (label, index, names) => index === 0 || label !== names[index - 1],
        )
        .join(" / "),
      ...value,
    });
  for (const [key, child] of Object.entries(value))
    if (key !== "rows" && key !== "_source") {
      const childName =
        child &&
        typeof child === "object" &&
        typeof (child as { name?: unknown }).name === "string"
          ? (child as { name: string }).name
          : undefined;
      found.push(
        ...walk(
          child,
          [...path, key],
          childName ? [...labels, childName] : labels,
        ),
      );
    }
  return found;
}
export function getTables(data: any): OracleTable[] {
  return walk(resolve(data?.oracles))
    .filter((t) => t.rows)
    .map((table) => ({ ...table, collectionId: table.id.split("/")[0] }));
}
export function tableDisplayName(table: OracleTable | undefined): string {
  for (const value of [table?.label, table?.name, table?.tableId]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Oracle table";
}
export type ResultPart = {
  type: "text" | "link" | "reference";
  value: string;
  id?: string;
};
export function referenceExplanation(reference: string): string {
  const match = reference.match(/^(.+?);\s*pg\s+([^\s]+)(?:\s+.*)?$/i);
  if (!match)
    return `Source-book lookup: ${reference}. Consult the source book for details.`;
  const page = /^x+$/i.test(match[2]) ? "page unknown" : `page ${match[2]}`;
  return `Source-book lookup: ${reference}. Consult the source book at ${page} for details.`;
}
export function resultParts(row: OracleRow | undefined): ResultPart[] {
  const resolved = resolve(row);
  const text =
    [resolved?.text, resolved?.text2, resolved?.text3]
      .filter(Boolean)
      .join("\n") ||
    resolved?.result ||
    resolved?.description;
  if (!text) return [{ type: "text", value: "No result for this roll." }];
  const parts = [];
  const linkPattern = /\[([^\]]+)\]\(id:([^)]*)\)/g;
  const referencePattern = />\s*([^;]+;\s*pg\s+[^\s]+)/gi;
  const matches = [
    ...[...String(text).matchAll(linkPattern)].map((match) => ({
      kind: "link" as const,
      match,
    })),
    ...[...String(text).matchAll(referencePattern)].map((match) => ({
      kind: "reference" as const,
      match,
    })),
  ].sort((left, right) => left.match.index - right.match.index);
  let cursor = 0;
  for (const { kind, match } of matches) {
    if (match.index > cursor)
      parts.push({
        type: "text",
        value: String(text).slice(cursor, match.index),
      });
    parts.push(
      kind === "link"
        ? { type: "link", value: match[1], id: match[2] }
        : { type: "reference", value: match[1].trim() },
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < String(text).length)
    parts.push({ type: "text", value: String(text).slice(cursor) });
  return parts.length ? parts : [{ type: "text", value: String(text) }];
}
export function resultText(row: OracleRow | undefined): string {
  return resultParts(row)
    .map((part) => part.value)
    .join("")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1");
}
export function rowRange(
  table: OracleTable | undefined,
  index: number,
): [number, number] | undefined {
  const row = table?.rows?.[index];
  if (row?.min != null && row.max != null)
    return [Number(row.min), Number(row.max)];
  if (table?.rows?.every((item) => item.min == null && item.max == null))
    return [index + 1, index + 1];
}
export function rollCeiling(table: OracleTable | undefined): number {
  const rows = table?.rows ?? [];
  if (rows.length && rows.every((row) => row.min == null && row.max == null))
    return rows.length;
  const die = table?.dice?.match(/^(?:1)?d(\d+)$/i);
  if (die) return Number(die[1]);
  return Math.max(
    0,
    ...rows.map((row) => Number(row.max)).filter(Number.isFinite),
  );
}
export function rollLabel(table: OracleTable | undefined): string {
  const die = table?.dice?.match(/^(?:1)?d(\d+)$/i);
  return die ? `Roll d${die[1]}` : "Roll";
}
export function rollTable(
  table: OracleTable | undefined,
  random = Math.random,
) {
  const rows = table?.rows ?? [];
  const ceiling = rollCeiling(table);
  const roll = Math.floor(random() * ceiling) + 1;
  const row = rows.find((_, index) => {
    const range = rowRange(table, index);
    return range && roll >= range[0] && roll <= range[1];
  });
  return { roll, result: resultText(row), row };
}
export function favouriteKey(table: OracleTable): string {
  return table.id ?? "";
}
