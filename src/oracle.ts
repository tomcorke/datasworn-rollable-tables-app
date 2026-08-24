export type OracleRow = {
  min?: number | string;
  max?: number | string;
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
  if (Array.isArray(value.rows))
    found.push({
      id: path.join("/"),
      tableId: path.at(-1),
      label: [...labels, value.name]
        .filter(Boolean)
        .filter(
          (name, index, names) => index === 0 || name !== names[index - 1],
        )
        .join(" / "),
      ...value,
    });
  for (const [key, child] of Object.entries(value))
    if (key !== "rows" && key !== "_source") {
      const named = child as { name?: string };
      found.push(
        ...walk(
          child,
          [...path, key],
          named?.name ? [...labels, named.name] : labels,
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
export function rollTable(
  table: OracleTable | undefined,
  random = Math.random,
) {
  const roll = Math.floor(random() * 100) + 1;
  const row = (table?.rows ?? []).find(
    (r) => roll >= Number(r.min) && roll <= Number(r.max),
  );
  return { roll, result: resultText(row) };
}
export function favouriteKey(table: OracleTable): string {
  return table.id ?? "";
}
