ellipse
Element
An ellipse with optional content.

Example
// Without content.
#ellipse(width: 35%, height: 30pt)

// With content.
#ellipse[
#set align(center)
Automatically sized \
 to fit the content.
]

Parameters
ellipse(
width: autorelative,
height: autorelativefraction,
fill: nonecolorgradienttiling,
stroke: noneautolengthcolorgradientstroketilingdictionary,
inset: relativedictionary,
outset: relativedictionary,
nonecontent,
) → content
width
auto or relative
Settable
Default: auto
The ellipse’s width, relative to its parent container.

height
auto or relative or fraction
Settable
Default: auto
The ellipse’s height, relative to its parent container.

fill
none or color or gradient or tiling
Settable
Default: none
How to fill the ellipse. See the rectangle’s documentation for more details.

stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the ellipse. See the rectangle’s documentation for more details.

inset
relative or dictionary
Settable
Default: 0% + 5pt
How much to pad the ellipse’s content. See the box’s documentation for more details.

outset
relative or dictionary
Settable
Default: (:)
How much to expand the ellipse’s size without affecting the layout. See the box’s documentation for more details.

body
none or content
Positional
Settable
Default: none
The content to place into the ellipse.

When this is omitted, the ellipse takes on a default size of at most 45pt by 30pt.
