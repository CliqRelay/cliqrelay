polygon
Element
A closed polygon.

The polygon is defined by its corner points and is closed automatically.

Example
#polygon(
fill: blue.lighten(80%),
stroke: blue,
(20%, 0pt),
(60%, 0pt),
(80%, 2cm),
(0%, 2cm),
)

Parameters
polygon(
fill: nonecolorgradienttiling,
fill-rule: str,
stroke: noneautolengthcolorgradientstroketilingdictionary,
..array,
) → content
fill
none or color or gradient or tiling
Settable
Default: none
How to fill the polygon.

When setting a fill, the default stroke disappears. To create a rectangle with both fill and stroke, you have to configure both.

fill-rule
str
Settable
Default: "non-zero"
The drawing rule used to fill the polygon.

See the curve documentation for an example.

Variant Details
"non-zero" Specifies that “inside” is computed by a non-zero sum of signed edge crossings.
"even-odd" Specifies that “inside” is computed by an odd number of edge crossings.
stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the polygon.

Can be set to none to disable the stroke or to auto for a stroke of 1pt black if and only if no fill is given.

vertices
array
Required
Positional
Variadic
The vertices of the polygon. Each point is specified as an array of two relative lengths.

Definitions
regular
A regular polygon, defined by its size and number of vertices.

polygon.regular(
fill: nonecolorgradienttiling,
stroke: noneautolengthcolorgradientstroketilingdictionary,
size: length,
vertices: int,
) → content
fill
none or color or gradient or tiling
How to fill the polygon. See the general polygon’s documentation for more details.

stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
How to stroke the polygon. See the general polygon’s documentation for more details.

size
length
Default: 1em
The diameter of the circumcircle of the regular polygon.

vertices
int
Default: 3
The number of vertices in the polygon.
