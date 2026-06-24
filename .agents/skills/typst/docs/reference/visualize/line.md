line
Element
A line from one point to another.

Example
#set page(height: 100pt)

#line(length: 100%)
#line(end: (50%, 50%))
#line(
length: 4cm,
stroke: 2pt + maroon,
)

Parameters
line(
start: array,
end: nonearray,
length: relative,
angle: angle,
stroke: lengthcolorgradientstroketilingdictionary,
) → content
start
array
Settable
Default: (0% + 0pt, 0% + 0pt)
The start point of the line.

Must be an array of exactly two relative lengths.

end
none or array
Settable
Default: none
The point where the line ends.

length
relative
Settable
Default: 0% + 30pt
The line’s length. This is only respected if end is none.

angle
angle
Settable
Default: 0deg
The angle at which the line points away from the origin. This is only respected if end is none.

stroke
length or color or gradient or stroke or tiling or dictionary
Settable
Default: 1pt + black
How to stroke the line.
