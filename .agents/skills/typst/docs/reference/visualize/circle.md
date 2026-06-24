circle
Element
A circle with optional content.

Example
// Without content.
#circle(radius: 25pt)

// With content.
#circle[
#set align(center + horizon)
Automatically \
 sized to fit.
]

Parameters
circle(
radius: length,
width: autorelative,
height: autorelativefraction,
fill: nonecolorgradienttiling,
stroke: noneautolengthcolorgradientstroketilingdictionary,
inset: relativedictionary,
outset: relativedictionary,
nonecontent,
) → content
radius
length
Default: 0pt
The circle’s radius. This is mutually exclusive with width and height.

width
auto or relative
Settable
Default: auto
The circle’s width. This is mutually exclusive with radius and height.

In contrast to radius, this can be relative to the parent container’s width.

height
auto or relative or fraction
Settable
Default: auto
The circle’s height. This is mutually exclusive with radius and width.

In contrast to radius, this can be relative to the parent container’s height.

fill
none or color or gradient or tiling
Settable
Default: none
How to fill the circle. See the rectangle’s documentation for more details.

stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the circle. See the rectangle’s documentation for more details.

inset
relative or dictionary
Settable
Default: 0% + 5pt
How much to pad the circle’s content. See the box’s documentation for more details.

outset
relative or dictionary
Settable
Default: (:)
How much to expand the circle’s size without affecting the layout. See the box’s documentation for more details.

body
none or content
Positional
Settable
Default: none
The content to place into the circle. The circle expands to fit this content, keeping the 1-1 aspect ratio.
