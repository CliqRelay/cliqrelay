import { createHighlightedCodeBlockProps } from "@tanstack/highlight/react";

import { describe, expect, test } from "vitest";

import { highlightThemeCss, highlighter } from "./highlight";

describe("highlighter", () => {
  test("normalises bash to the shell language", () => {
    expect(highlighter.normalizeLanguage("bash")).toBe("shell");
  });

  test("normalises typescript to the ts language", () => {
    expect(highlighter.normalizeLanguage("typescript")).toBe("ts");
  });

  test("highlights code into token markup", () => {
    const { htmlMarkup } = createHighlightedCodeBlockProps({
      highlighter,
      code: "const answer = 42;",
      lang: "typescript",
    });

    expect(htmlMarkup).toContain("th-keyword");
    expect(htmlMarkup).toContain("th-number");
    expect(htmlMarkup).toContain("answer");
  });

  test("produces identical markup for the same code and language", () => {
    const code = "SELECT * FROM guides WHERE id = 1;";
    const options = { highlighter, code, lang: "sql" };

    const first = createHighlightedCodeBlockProps(options).htmlMarkup;
    const second = createHighlightedCodeBlockProps(options).htmlMarkup;

    expect(first).toBe(second);
  });

  test("generates light, dark, and token variables", () => {
    expect(highlightThemeCss).toContain(":root");
    expect(highlightThemeCss).toContain(".dark");
    expect(highlightThemeCss).toContain("--th-keyword");
  });
});
