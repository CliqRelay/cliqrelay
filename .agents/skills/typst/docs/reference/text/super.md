super
Element
Renders text in superscript.

The text is rendered smaller and its baseline is raised.

Example
1#super[st] try!

Parameters
super(
typographic: bool,
baseline: autolength,
size: autolength,
content,
) → content
typographic
bool
Settable
Default: true
Whether to use superscript glyphs from the font if available.

Ideally, superscripts glyphs are provided by the font (using the sups OpenType feature). Otherwise, Typst is able to synthesize superscripts by raising and scaling down regular glyphs.

When this is set to false, synthesized glyphs will be used regardless of whether the font provides dedicated superscript glyphs. When true, synthesized glyphs may still be used in case the font does not provide the necessary superscript glyphs.

baseline
auto or length
Settable
Default: auto
The downward baseline shift for synthesized superscripts.

This only applies to synthesized superscripts. In other words, this has no effect if typographic is true and the font provides the necessary superscript glyphs.

If set to auto, the baseline is shifted according to the metrics provided by the font, with a fallback to -0.5em in case the font does not define the necessary metrics.

Note that, since the baseline shift is applied downward, you will need to provide a negative value for the content to appear as raised above the normal baseline.

Sometimes it is necessary to set baseline and size explicitly. In the following example, the superscripted text uses multiple fonts with incompatible metrics. To avoid misalignment, we override the metrics for all fonts.

size
auto or length
Settable
Default: auto
The font size for synthesized superscripts.

This only applies to synthesized superscripts. In other words, this has no effect if typographic is true and the font provides the necessary superscript glyphs.

If set to auto, the size is scaled according to the metrics provided by the font, with a fallback to 0.6em in case the font does not define the necessary metrics.

body
content
Required
Positional
The text to display in superscript.
