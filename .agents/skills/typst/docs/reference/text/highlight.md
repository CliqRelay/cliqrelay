highlight
Element
Highlights text with a background color.

Example
This is #highlight[important].

Parameters
highlight(
fill: nonecolorgradienttiling,
stroke: nonelengthcolorgradientstroketilingdictionary,
top-edge: lengthstr,
bottom-edge: lengthstr,
extent: length,
radius: relativedictionary,
content,
) → content
fill
none or color or gradient or tiling
Settable
Default: rgb("#fffd11a1")
The color to highlight the text with.

stroke
none or length or color or gradient or stroke or tiling or dictionary
Settable
Default: (:)
The highlight’s border color. See the rectangle’s documentation for more details.

top-edge
length or str
Settable
Default: "ascender"
The top end of the background rectangle.

Variant Details
"ascender" The font’s ascender, which typically exceeds the height of all glyphs.
"cap-height" The approximate height of uppercase letters.
"x-height" The approximate height of non-ascending lowercase letters.
"baseline" The baseline on which the letters rest.
"bounds" The top edge of the glyph’s bounding box.
bottom-edge
length or str
Settable
Default: "descender"
The bottom end of the background rectangle.

Variant Details
"baseline" The baseline on which the letters rest.
"descender" The font’s descender, which typically exceeds the depth of all glyphs.
"bounds" The bottom edge of the glyph’s bounding box.
extent
length
Settable
Default: 0pt
The amount by which to extend the background to the sides beyond (or within if negative) the content.

radius
relative or dictionary
Settable
Default: (:)
How much to round the highlight’s corners. See the rectangle’s documentation for more details.

body
content
Required
Positional
The content that should be highlighted.
