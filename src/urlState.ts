import type { OracleTable } from "./oracle";

export type UrlTable = OracleTable & { collectionKey?: string };

export type Selection = {
  collectionKey: string;
  table?: UrlTable;
};

export function readUrlSelection(search: string) {
  const params = new URLSearchParams(search);
  return {
    collectionKey: params.get("collection") ?? undefined,
    tableId: params.get("table") ?? undefined,
  };
}

export function resolveSelection(
  search: string,
  tables: UrlTable[],
  savedCollectionKey?: string,
  savedTableId?: string,
): Selection {
  const fromUrl = readUrlSelection(search);
  const collectionKeys = new Set(
    tables.map((table) => table.collectionKey).filter(Boolean),
  );
  const urlCollection =
    fromUrl.collectionKey && collectionKeys.has(fromUrl.collectionKey)
      ? fromUrl.collectionKey
      : undefined;
  const savedCollection =
    savedCollectionKey && collectionKeys.has(savedCollectionKey)
      ? savedCollectionKey
      : undefined;
  let collectionKey =
    urlCollection ?? savedCollection ?? tables[0]?.collectionKey ?? "";

  const requestedTableId =
    fromUrl.tableId ?? (urlCollection ? undefined : savedTableId);
  if (requestedTableId) {
    const candidates = tables.filter((table) => table.id === requestedTableId);
    const table =
      candidates.find((item) => item.collectionKey === collectionKey) ??
      candidates[0];
    if (table) {
      collectionKey = table.collectionKey ?? collectionKey;
      return { collectionKey, table };
    }
  }

  return {
    collectionKey,
    table: tables.find((table) => table.collectionKey === collectionKey),
  };
}

export function selectionUrl(
  href: string,
  collectionKey: string,
  tableId: string,
): string {
  const url = new URL(href);
  url.searchParams.set("collection", collectionKey);
  url.searchParams.set("table", tableId);
  return `${url.pathname}${url.search}${url.hash}`;
}
