---
name: typst
description: |
  Use this skill to write and generate documents using Typst, a markup-based
  typesetting system. Provides structured access to Typst's full reference
  documentation: tutorial chapters, language reference modules, and standalone
  pages for syntax, scripting, styling, and context.
---

# Typst Documentation Map

All paths are relative to `docs/`.

## Tutorial

| Chapter | File |
|---|---|
| Introduction & getting started | `tutorial/intro.md` |
| Writing in Typst | `tutorial/writing-in-typst.md` |
| Formatting | `tutorial/formatting.md` |
| Advanced Styling | `tutorial/advanced-styling.md` |
| Making a Template | `tutorial/making-a-template.md` |

## Reference Modules

Each module has an intro (if listed), then per-feature files. Files are listed by
their stem (e.g. `align` → `reference/layout/align.md`).

### Foundations — Core types & built-in functions

Intro: `reference/foundations/intro.md`

`arguments`, `array`, `assert`, `auto`, `bool`, `bytes`, `calculation`, `content`,
`datetime`, `decimal`, `dictionary`, `duration`, `eval`, `float`, `function`, `int`,
`label`, `module`, `none`, `panic`, `path`, `plugin`, `regex`, `repr`, `selector`,
`std`, `string`, `symbol`, `system`, `target`, `type`, `version`

### Layout — Page arrangement, spacing, transforms

Intro: `reference/layout/intro.md`

`align`, `alignment`, `angle`, `block`, `box`, `colbreak`, `columns`, `direction`,
`fraction`, `grid`, `h`, `hide`, `layout`, `length`, `measure`, `move`, `pad`,
`page`, `pagebreak`, `place`, `ratio`, `relative`, `repeat`, `rotate`, `scale`,
`skew`, `stack`, `v`, `visualize`

### Text — Fonts, styling, raw code, case transforms

`highlight`, `linebreak`, `lorem`, `lower`, `overline`, `raw`, `smallcaps`,
`smartquote`, `strike`, `sub`, `super`, `text`, `underline`, `upper`

### Math — Formulas, equations, math notation

Intro: `reference/math/intro.md`

`accent`, `attach`, `binom`, `cancel`, `cases`, `class`, `equation`, `frac`,
`leftright`, `matrix`, `op`, `primes`, `roots`, `sizes`, `stretch`, `styles`,
`underover`, `variants`, `vector`

### Models — Document structures (headings, lists, tables, citations)

Intro: `reference/models/intro.md`

`asset`, `bibliography`, `cite`, `divider`, `document`, `emph`, `enum`, `figure`,
`footnote`, `heading`, `link`, `list`, `numbering`, `outline`, `par`, `parbreak`,
`quote`, `ref`, `strong`, `table`, `terms`, `text`, `title`

### Visualize — Shapes, colors, gradients, images

`circle`, `color`, `curve`, `ellipse`, `gradient`, `image`, `line`, `polygon`,
`rect`, `square`, `stroke`, `tiling`

### Introspection — Counters, state, queries, metadata

Intro: `reference/introspection/intro.md`

`counter`, `here`, `locate`, `location`, `metadata`, `query`, `state`

### Data Loading — Reading external files

Intro: `reference/data-loading/intro.md`

`cbor`, `csv`, `json`, `read`, `toml`, `xml`, `yaml`

### Export — Output formats

**PDF** — intro: `reference/export/pdf/intro.md`
`artifact`, `attach`, `data-cell`, `header-cell`, `table-summary`

**HTML** — intro: `reference/export/html/intro.md`
`elem`, `frame`, `typed`

**Other:** `bundle` (reference/export/bundle.md), `png`, `svg`

### Symbols — Emoji & special characters

Intro: `reference/symbols/intro.md`

`emoji`, `general-symbols`

## Standalone Reference Pages

These are top-level files covering cross-cutting language concepts:

| Topic | File |
|---|---|
| Syntax (markup/math/code modes) | `reference/syntax.md` |
| Scripting (expressions, blocks, closures) | `reference/scripting.md` |
| Styling (set rules, show rules) | `reference/styling.md` |
| Context (contextual queries, style access) | `reference/context.md` |

## Quick Guide for the Agent

- **New to Typst?** Start with the tutorial files for a step-by-step intro.
- **Need a specific function?** Find its module above, then read `<module>/<name>.md`.
- **Set/show rules?** See `reference/styling.md`.
- **Scripting (variables, loops, functions)?** See `reference/scripting.md`.
- **Context-dependent values (counter, state, layout)?** See `reference/context.md`.
- **Output to PDF/HTML/PNG/SVG?** See `reference/export/`.
- **Math notation?** See `reference/math/`.
