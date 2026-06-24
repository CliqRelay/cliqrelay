square
Element
A square with optional content.

Example
// Without content.
#square(size: 40pt)

// With content.
#square[
Automatically \
 sized to fit.
]

Parameters
square(
size: autolength,
width: autorelative,
height: autorelativefraction,
fill: nonecolorgradienttiling,
stroke: noneautolengthcolorgradientstroketilingdictionary,
radius: relativedictionary,
inset: relativedictionary,
outset: relativedictionary,
nonecontent,
) → content
size
auto or length
Default: auto
The square’s side length. This is mutually exclusive with width and height.

width
auto or relative
Settable
Default: auto
The square’s width. This is mutually exclusive with size and height.

In contrast to size, this can be relative to the parent container’s width.

height
auto or relative or fraction
Settable
Default: auto
The square’s height. This is mutually exclusive with size and width.

In contrast to size, this can be relative to the parent container’s height.

fill
none or color or gradient or tiling
Settable
Default: none
How to fill the square. See the rectangle’s documentation for more details.

stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the square. See the rectangle’s documentation for more details.

radius
relative or dictionary
Settable
Default: (:)
How much to round the square’s corners. See the rectangle’s documentation for more details.

inset
relative or dictionary
Settable
Default: 0% + 5pt
How much to pad the square’s content. See the box’s documentation for more details.

outset
relative or dictionary
Settable
Default: (:)
How much to expand the square’s size without affecting the layout. See the box’s documentation for more details.

body
none or content
Positional
Settable
Default: none
The content to place into the square. The square expands to fit this content, keeping the 1-1 aspect ratio.

When this is omitted, the square takes on a default size of at most 30pt.
