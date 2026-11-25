import { createHighlighter } from "@tanstack/highlight/core";
import { go } from "@tanstack/highlight/languages/go";
import { json } from "@tanstack/highlight/languages/json";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { ts } from "@tanstack/highlight/languages/ts";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubDarkTheme } from "@tanstack/highlight/themes/github-dark";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

export const highlighter = createHighlighter({
  languages: [shell, ts, json, yaml, sql, go, python, plaintext],
});

export const highlightThemeCss: string = createThemeCss({
  light: githubLightTheme,
  dark: githubDarkTheme,
  darkSelector: ".dark",
});
