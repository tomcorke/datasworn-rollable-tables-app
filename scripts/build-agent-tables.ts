import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parse } from "yaml";

type AnyRecord = Record<string, any>;
type Table = AnyRecord & {
  id: string;
  ruleset: string;
  collection: string;
  sourceFile: string;
  tableName: string;
  filename: string;
};

const root = process.cwd();
const dataDir = join(root, "src/data");
const outputDir = join(root, "agent-tables");
const sourceFiles = (await readdir(dataDir))
  .filter((file) => file.endsWith(".yaml"))
  .sort();
const tables: Table[] = [];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function text(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return String(value);
}
function walk(
  value: unknown,
  path: string[],
  names: string[],
  sourceFile: string,
  ruleset: string,
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const object = value as AnyRecord;
  const name = typeof object.name === "string" ? object.name : "";
  if (Array.isArray(object.rows)) {
    const id = path.join("/");
    const tableName = name || path.at(-1) || "Oracle table";
    tables.push({
      ...object,
      id,
      ruleset,
      collection: names[1] || names[0] || ruleset,
      sourceFile,
      tableName,
      filename: `${slug(ruleset)}--${slug(id.split("/").slice(1).join("--"))}.md`,
    });
    return;
  }
  for (const [key, child] of Object.entries(object)) {
    if (key === "_source") continue;
    const childName =
      child &&
      typeof child === "object" &&
      !Array.isArray(child) &&
      typeof (child as AnyRecord).name === "string"
        ? (child as AnyRecord).name
        : "";
    walk(
      child,
      [...path, key],
      childName ? [...names, childName] : names,
      sourceFile,
      ruleset,
    );
  }
}

for (const sourceFile of sourceFiles) {
  const source = parse(await readFile(join(dataDir, sourceFile), "utf8"), {
    maxAliasCount: -1,
  }) as AnyRecord;
  if (!source) continue;
  const ruleset = source._id || basename(sourceFile, ".yaml").split("-")[0];
  walk(source.oracles, [ruleset], [ruleset], sourceFile, ruleset);
}
const byId = new Map(tables.map((table) => [table.id, table]));
const linkPattern = /\[([^\]]+)\]\(id:([^)]*)\)/g;
function formatResult(value: unknown): string {
  return text(value).replace(/\r\n/g, "\n").trim();
}
function result(row: AnyRecord): string {
  const fields = [row.text, row.text2, row.text3].filter(
    (value) => value != null && text(value) !== "",
  );
  return formatResult(
    fields.length
      ? fields.join("\n")
      : (row.result ?? row.description ?? "No result text supplied."),
  );
}
function referenceLines(value: string): string[] {
  return [...value.matchAll(linkPattern)].map(([_, label, id]) => {
    const target = byId.get(id);
    return `- **${label}** - [${id}](${target ? target.filename : "#unresolved-reference"})${target ? "" : " *(unresolved in bundled data)*"}`;
  });
}
function range(row: AnyRecord, index: number): string {
  if (row.min != null || row.max != null)
    return `${row.min ?? row.max}-${row.max ?? row.min}`;
  if (Array.isArray(row.roll) && row.roll.length) return row.roll.join(", ");
  return String(index + 1);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const sorted = tables.sort((a, b) => a.id.localeCompare(b.id));
for (const table of sorted) {
  const source = table._source as AnyRecord | undefined;
  const description = text(
    table.summary || table.description || "No description supplied.",
  );
  const rows = (table.rows as AnyRecord[])
    .map((row, index) => {
      const rowResult = result(row);
      const references = referenceLines(rowResult);
      return [
        `### ${range(row, index)}`,
        "",
        rowResult,
        references.length ? `\n**References**\n${references.join("\n")}` : "",
      ].join("\n");
    })
    .join("\n\n");
  const content = [
    `# ${table.tableName}`,
    "",
    `- **Ruleset:** ${table.ruleset}`,
    `- **Collection:** ${table.collection}`,
    `- **Table ID:** \`${table.id}\``,
    `- **Source data:** \`src/data/${table.sourceFile}\``,
    source?.title
      ? `- **Source book:** ${source.title}${source.page ? `, page ${source.page}` : ""}`
      : "",
    table.dice ? `- **Dice:** \`${table.dice}\`` : "",
    "",
    `## Description\n\n${description}`,
    "",
    "## Results",
    "",
    rows,
    "",
    "## Reference syntax",
    "",
    "Links in results use Datasworn IDs. Resolved links point to the corresponding flat-directory file; unresolved links are labelled explicitly.",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  await writeFile(join(outputDir, table.filename), `${content}\n`);
}
const index = [
  "# Datasworn Roll Tables - Agent Reference",
  "",
  `Generated from the bundled Datasworn YAML source in \`src/data/\`. This flat directory contains **${sorted.length} rollable tables**. Each file includes stable table metadata, explicit ranges, result text (including line breaks), and clearly marked table references.`,
  "",
  "Use the table ID to identify a table independently of its filename. Links to resolved tables use relative Markdown links. References that cannot be matched in the bundled data are marked *(unresolved in bundled data)*.",
  "",
  "## Index",
  "",
  "| Table | Ruleset | Collection | Description |",
  "| --- | --- | --- | --- |",
  ...sorted.map((table) => {
    const description = text(
      table.summary || table.description || "No description supplied.",
    )
      .replace(/\|/g, "\\|")
      .replace(/\s+/g, " ")
      .trim();
    return `| [${table.tableName}](${table.filename}) | ${table.ruleset} | ${table.collection} | ${description} |`;
  }),
  "",
  "## Generation",
  "",
  "Run `npm run data:build:agent` to regenerate this directory after changing the bundled source data.",
  "",
].join("\n");
await writeFile(join(outputDir, "README.md"), index);
console.log(`Generated ${sorted.length} agent-readable tables in ${outputDir}`);
