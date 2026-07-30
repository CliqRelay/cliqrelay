const URL_PATTERN = /https?:\/\/(?:(?:[a-zA-Z0-9][-a-zA-Z0-9]*\.)+)?[-a-zA-Z0-9]{1,256}\.[a-zA-Z0-9]{1,63}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/

export function isUrlMatch(text: string): boolean {
  return URL_PATTERN.test(text)
}

export type TextSegment =
  | { type: "text"; value: string }
  | { type: "url"; value: string };

export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = new RegExp(URL_PATTERN.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const urlStart = match.index;
    const urlEnd = regex.lastIndex;
    const url = match[0];

    const charBefore = urlStart > 0 ? text[urlStart - 1] : undefined;
    const charAfter = urlEnd < text.length ? text[urlEnd] : undefined;
    const hasQuotes = charBefore === '"' && charAfter === '"';

    if (hasQuotes) {
      if (urlStart - 1 > lastIndex) {
        segments.push({ type: "text", value: text.slice(lastIndex, urlStart - 1) });
      }
    } else {
      if (urlStart > lastIndex) {
        segments.push({ type: "text", value: text.slice(lastIndex, urlStart) });
      }
    }

    segments.push({ type: "url", value: url });

    lastIndex = hasQuotes ? urlEnd + 1 : urlEnd;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: text });
  }

  return segments;
} 
