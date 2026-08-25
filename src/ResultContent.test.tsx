import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResultContent } from "./ResultContent";
import type { OracleTable } from "./oracle";

const linkedTable: OracleTable = { id: "linked", rows: [] };
const render = (text: string, resolve = () => undefined) =>
  renderToStaticMarkup(
    <ResultContent
      row={{ text }}
      resolveTable={resolve}
      onChoose={() => undefined}
    />,
  );

describe("ResultContent", () => {
  it("renders resolved and unavailable table references", () => {
    expect(render("[Linked](id:linked)", () => linkedTable)).toContain(
      'class="inline-link"',
    );
    const unavailable = render("[Missing](id:missing)");
    expect(unavailable).toContain('class="unresolved-link"');
    expect(unavailable).toContain("(unavailable)");
  });

  it("preserves multiline text and full reference details", () => {
    const markup = render("First\nSecond > Cave; pg XX");
    expect(markup).toContain("First\nSecond ");
    expect(markup).toContain("Source-book lookup");
    expect(markup).toContain("page unknown");
    expect(markup).toMatch(
      /book-reference-mark" aria-hidden="true">↗<\/span><span class="book-reference-content">/,
    );
  });

  it("renders compact references without help text", () => {
    const markup = renderToStaticMarkup(
      <ResultContent
        row={{ text: "> Cave; pg XX" }}
        resolveTable={() => undefined}
        onChoose={() => undefined}
        compactReferences
      />,
    );
    expect(markup).toContain("book-reference-compact");
    expect(markup).toContain('book-reference-mark" aria-hidden="true"');
    expect(markup).not.toContain("page unknown");
  });
});
