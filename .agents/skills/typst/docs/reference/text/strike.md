strike
Element
Strikes through text.

Example
This is #strike[not] relevant.

Parameters
strike(
stroke: autolengthcolorgradientstroketilingdictionary,
offset: autolength,
extent: length,
background: bool,
content,
) → content
stroke
auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the line.

If set to auto, takes on the text’s color and a thickness defined in the current font.

Note: Please don’t use this for real redaction as you can still copy paste the text.

offset
auto or length
Settable
Default: auto
The position of the line relative to the baseline. Read from the font tables if auto.

This is useful if you are unhappy with the offset your font provides.

extent
length
Settable
Default: 0pt
The amount by which to extend the line beyond (or within if negative) the content.

background
bool
Settable
Default: false
Whether the line is placed behind the content.

body
content
Required
Positional
The content to strike through.
