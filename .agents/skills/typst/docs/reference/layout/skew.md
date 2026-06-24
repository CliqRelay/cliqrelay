skew
Element
Skews content.

Skews an element in horizontal and/or vertical direction. The layout will act as if the element was not skewed unless you specify reflow: true.

Example
#skew(ax: -12deg)[
This is some fake italic text.
]

Parameters
skew(
ax: angle,
ay: angle,
origin: alignment,
reflow: bool,
content,
) → content
ax
angle
Settable
Default: 0deg
The horizontal skewing angle.

ay
angle
Settable
Default: 0deg
The vertical skewing angle.

origin
alignment
Settable
Default: center + horizon
The origin of the skew transformation.

The origin will stay fixed during the operation.

reflow
bool
Settable
Default: false
Whether the skew transformation impacts the layout.

If set to false, the skewed content will retain the bounding box of the original content. If set to true, the bounding box will take the transformation of the content into account and adjust the layout accordingly.

body
content
Required
Positional
The content to skew.
