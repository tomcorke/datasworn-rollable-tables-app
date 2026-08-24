import React from "react";
import type { OracleRow, OracleTable } from "./oracle";
import { referenceExplanation, resultParts, resultText } from "./oracle";

type ResultContentProps = {
  row?: OracleRow;
  resolveTable: (id: string) => OracleTable | undefined;
  onChoose: (table: OracleTable) => void;
  compactReferences?: boolean;
};

export function ResultContent({
  row,
  resolveTable,
  onChoose,
  compactReferences = false,
}: ResultContentProps) {
  return resultParts(row).map((part, index) => {
    if (part.type === "reference")
      return compactReferences ? (
        <span
          className="book-reference book-reference-compact"
          key={index}
          title="Source-book reference"
        >
          {part.value}
        </span>
      ) : (
        <span className="book-reference" key={index}>
          <span className="book-reference-label">Source-book lookup</span>
          <span>{part.value}</span>
          <span className="book-reference-help">
            {referenceExplanation(part.value)}
          </span>
        </span>
      );
    if (part.type === "link") {
      const linkedTable = resolveTable(part.id ?? "");
      return linkedTable ? (
        <button
          className="inline-link"
          key={index}
          onClick={() => onChoose(linkedTable)}
          title="Open linked oracle table"
        >
          {resultText({ text: part.value })}{" "}
          <span className="link-mark">↗</span>
        </button>
      ) : (
        <span
          className="unresolved-link"
          key={index}
          title="This linked oracle table is not included in the bundled data"
        >
          {resultText({ text: part.value })}{" "}
          <span className="link-mark" aria-hidden="true">
            ⚠
          </span>
          <span className="sr-only"> (unavailable)</span>
        </span>
      );
    }
    return (
      <React.Fragment key={index}>
        {resultText({ text: part.value })}
      </React.Fragment>
    );
  });
}
