underline
Element
Underlines text.

Example
This is #underline[important].

Parameters
underline(
stroke: autolengthcolorgradientstroketilingdictionary,
offset: autolength,
extent: length,
evade: bool,
background: bool,
content,
) → content
stroke
auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the line.

If set to auto, takes on the text’s color and a thickness defined in the current font.

offset
auto or length
Settable
Default: auto
The position of the line relative to the baseline, read from the font tables if auto.

extent
length
Settable
Default: 0pt
The amount by which to extend the line beyond (or within if negative) the content.

evade
bool
Settable
Default: true
Whether the line skips sections in which it would collide with the glyphs.

background
bool
Settable
Default: false
Whether the line is placed behind the content it underlines.

body
content
Required
Positional
The content to underline.
