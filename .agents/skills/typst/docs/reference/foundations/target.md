target
Contextual
Returns the current export target.

This function returns

"paged" in PDF, PNG, and SVG export, or within an HTML frame
"html" in HTML export
"bundle" in Bundle export
When to use it
This function allows you to format your document properly across the paged, HTML, and multi file export targets. It should primarily be used in templates and show rules, rather than directly in content. This way, the document’s contents can be fully agnostic to the export target and content can be shared between different export targets.

Varying targets
This function is contextual as the target can vary within a single compilation: When exporting to HTML, the target will be "paged" while within an html.frame.

Example
#let kbd(it) = context {
if target() == "html" {
html.elem("kbd", it)
} else {
set text(fill: rgb("#1f2328"))
let r = 3pt
box(
fill: rgb("#f6f8fa"),
stroke: rgb("#d1d9e0b3"),
outset: (y: r),
inset: (x: r),
radius: r,
raw(it)
)
}
}

Press #kbd("F1") for help.

Parameters
target() → str
