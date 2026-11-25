import type { ReactNode } from "react";

import type { HighlightDecoration } from "@tanstack/highlight/core";
import { createHighlightedCodeBlockProps } from "@tanstack/highlight/react";

import { CheckIcon, CopyIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCopyCode } from "@/hooks/useCopyCode";
import { highlightThemeCss, highlighter } from "@/lib/highlight";
import { cn } from "@/lib/utils";
import { getCodeLanguageLabel } from "@/models";

type Props = {
  code: string;
  language: string;
  caption?: string | null;
  toolbar?: ReactNode;
  className?: string;
  onClick?: () => void;
  lineNumbers?: boolean;
  decorations?: ReadonlyArray<HighlightDecoration>;
};

export function CanvasCodeBlock({
  code,
  language,
  caption,
  toolbar,
  className,
  onClick,
  lineNumbers,
  decorations,
}: Props) {
  const { copied, copy } = useCopyCode(code);
  const { htmlMarkup } = createHighlightedCodeBlockProps({
    highlighter,
    code,
    lang: language,
    lineNumbers,
    decorations,
  });

  return (
    <div
      className={cn("group relative overflow-hidden rounded-lg border bg-card", className)}
      onClick={onClick}
    >
      <style href="tanstack-highlight" precedence="default">
        {highlightThemeCss}
      </style>

      {toolbar}

      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2 pr-12">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">{getCodeLanguageLabel(language)}</Badge>
          {caption && <span className="truncate text-xs text-muted-foreground">{caption}</span>}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={(event) => {
            event.stopPropagation();
            void copy();
          }}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {code ? (
        <div dangerouslySetInnerHTML={{ __html: htmlMarkup }} />
      ) : (
        <div className="px-4 py-3 text-sm text-muted-foreground">No code yet</div>
      )}
    </div>
  );
}
