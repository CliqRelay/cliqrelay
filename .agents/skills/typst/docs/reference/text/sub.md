sub
Element
Renders text in subscript.

The text is rendered smaller and its baseline is lowered.

Example
Revenue#sub[yearly]

Parameters
sub(
typographic: bool,
baseline: autolength,
size: autolength,
content,
) → content
typographic
bool
Settable
Default: true
Whether to use subscript glyphs from the font if available.

Ideally, subscripts glyphs are provided by the font (using the subs OpenType feature). Otherwise, Typst is able to synthesize subscripts by lowering and scaling down regular glyphs.

When this is set to false, synthesized glyphs will be used regardless of whether the font provides dedicated subscript glyphs. When true, synthesized glyphs may still be used in case the font does not provide the necessary subscript glyphs.

baseline
auto or length
Settable
Default: auto
The downward baseline shift for synthesized subscripts.

This only applies to synthesized subscripts. In other words, this has no effect if typographic is true and the font provides the necessary subscript glyphs.

If set to auto, the baseline is shifted according to the metrics provided by the font, with a fallback to 0.2em in case the font does not define the necessary metrics.

When using multiple fonts, it might be necessary to set baseline and size explicitly. See super for an example.

size
auto or length
Settable
Default: auto
The font size for synthesized subscripts.

This only applies to synthesized subscripts. In other words, this has no effect if typographic is true and the font provides the necessary subscript glyphs.

If set to auto, the size is scaled according to the metrics provided by the font, with a fallback to 0.6em in case the font does not define the necessary metrics.

body
content
Required
Positional
The text to display in subscript.
