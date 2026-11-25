export const CODE_LANGUAGE_VALUES = [
  "plaintext",
  "bash",
  "typescript",
  "json",
  "yaml",
  "sql",
  "go",
  "python",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGE_VALUES)[number];

export const CODE_LANGUAGES: ReadonlyArray<{ value: CodeLanguage; label: string }> = [
  { value: "plaintext", label: "Plain text" },
  { value: "bash", label: "Bash" },
  { value: "typescript", label: "TypeScript" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "sql", label: "SQL" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
];

export const DEFAULT_CODE_LANGUAGE: CodeLanguage = "plaintext";

export function getCodeLanguageLabel(language: string): string {
  return CODE_LANGUAGES.find((option) => option.value === language)?.label ?? language;
}
