alignment
Where to align something along an axis.

Possible values are:

start: Aligns at the start of the text direction.
end: Aligns at the end of the text direction.
left: Align at the left.
center: Aligns in the middle, horizontally.
right: Aligns at the right.
top: Aligns at the top.
horizon: Aligns in the middle, vertically.
bottom: Align at the bottom.
These values are available globally and also in the alignment type’s scope, so you can write either of the following two:

#align(center)[Hi]
#align(alignment.center)[Hi]

2D alignments
To align along both axes at the same time, add the two alignments using the + operator. For example, top + right aligns the content to the top right corner.

#set page(height: 3cm)
#align(center + bottom)[Hi]

Fields
The x and y fields hold the alignment’s horizontal and vertical components, respectively (as yet another alignment). They may be none.

#(top + right).x \
#left.x \
#left.y (none)

Definitions
axis
The axis this alignment belongs to.

"horizontal" for start, left, center, right, and end
"vertical" for top, horizon, and bottom
none for 2-dimensional alignments
self.axis() → nonestr
inv
The inverse alignment.

self.inv() → alignment
