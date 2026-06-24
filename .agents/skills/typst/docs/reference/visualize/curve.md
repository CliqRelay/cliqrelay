curve
Element
A curve consisting of movements, lines, and Bézier segments.

At any point in time, there is a conceptual pen or cursor.

Move elements move the cursor without drawing.
Line/Quadratic/Cubic elements draw a segment from the cursor to a new position, potentially with control point for a Bézier curve.
Close elements draw a straight or smooth line back to the start of the curve or the latest preceding move segment.
For layout purposes, the bounding box of the curve is a tight rectangle containing all segments as well as the point (0pt, 0pt).

Positions may be specified absolutely (i.e. relatively to (0pt, 0pt)), or relative to the current pen/cursor position, that is, the position where the previous segment ended.

Bézier curve control points can be skipped by passing none or automatically mirrored from the preceding segment by passing auto.

Example
#curve(
fill: blue.lighten(80%),
stroke: blue,
curve.move((0pt, 50pt)),
curve.line((100pt, 50pt)),
curve.cubic(none, (90pt, 0pt), (50pt, 0pt)),
curve.close(),
)

Parameters
curve(
fill: nonecolorgradienttiling,
fill-rule: str,
stroke: noneautolengthcolorgradientstroketilingdictionary,
..content,
) → content
fill
none or color or gradient or tiling
Settable
Default: none
How to fill the curve.

When setting a fill, the default stroke disappears. To create a curve with both fill and stroke, you have to configure both.

fill-rule
str
Settable
Default: "non-zero"
The drawing rule used to fill the curve.

Variant Details
"non-zero" Specifies that “inside” is computed by a non-zero sum of signed edge crossings.
"even-odd" Specifies that “inside” is computed by an odd number of edge crossings.
stroke
none or auto or length or color or gradient or stroke or tiling or dictionary
Settable
Default: auto
How to stroke the curve.

Can be set to none to disable the stroke or to auto for a stroke of 1pt black if and only if no fill is given.

components
content
Required
Positional
Variadic
The components of the curve, in the form of moves, line and Bézier segment, and closes.

Definitions
move
Element
Starts a new curve component.

If no curve.move element is passed, the curve will start at (0pt, 0pt).

curve.move(
array,
relative: bool,
) → content
start
array
Required
Positional
The starting point for the new component.

relative
bool
Settable
Default: false
Whether the coordinates are relative to the previous point.

line
Element
Adds a straight line from the current point to a following one.

curve.line(
array,
relative: bool,
) → content
end
array
Required
Positional
The point at which the line shall end.

relative
bool
Settable
Default: false
Whether the coordinates are relative to the previous point.

quad
Element
Adds a quadratic Bézier curve segment from the last point to end, using control as the control point.

curve.quad(
noneautoarray,
array,
relative: bool,
) → content
control
none or auto or array
Required
Positional
The control point of the quadratic Bézier curve.

If auto and this segment follows another quadratic Bézier curve, the previous control point will be mirrored.
If none, the control point defaults to end, and the curve will be a straight line.
end
array
Required
Positional
The point at which the segment shall end.

relative
bool
Settable
Default: false
Whether the control and end coordinates are relative to the previous point.

cubic
Element
Adds a cubic Bézier curve segment from the last point to end, using control-start and control-end as the control points.

curve.cubic(
noneautoarray,
nonearray,
array,
relative: bool,
) → content
control-start
none or auto or array
Required
Positional
The control point going out from the start of the curve segment.

If auto and this element follows another curve.cubic element, the last control point will be mirrored. In SVG terms, this makes curve.cubic behave like the S operator instead of the C operator.

If none, the curve has no first control point, or equivalently, the control point defaults to the curve’s starting point.

control-end
none or array
Required
Positional
The control point going into the end point of the curve segment.

If set to none, the curve has no end control point, or equivalently, the control point defaults to the curve’s end point.

end
array
Required
Positional
The point at which the curve segment shall end.

relative
bool
Settable
Default: false
Whether the control-start, control-end, and end coordinates are relative to the previous point.

close
Element
Closes the curve by adding a segment from the last point to the start of the curve (or the last preceding curve.move point).

curve.close(
mode
:
str
) → content
mode
str
Settable
Default: "smooth"
How to close the curve.

Variant Details
"smooth" Closes the curve with a smooth segment that takes into account the control point opposite the start point.
"straight" Closes the curve with a straight line.
