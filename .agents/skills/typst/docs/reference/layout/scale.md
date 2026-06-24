scale
Element
Scales content without affecting layout.

Lets you mirror content by specifying a negative scale on a single axis.

Example
#set align(center)
#scale(x: -100%)[This is mirrored.]
#scale(x: -100%, reflow: true)[This is mirrored.]

Parameters
scale(
factor: autolengthratio,
x: autolengthratio,
y: autolengthratio,
origin: alignment,
reflow: bool,
content,
) → content
factor
auto or length or ratio
Default: 100%
The scaling factor for both axes, as a positional argument. This is just an optional shorthand notation for setting x and y to the same value.

x
auto or length or ratio
Settable
Default: 100%
The horizontal scaling factor.

The body will be mirrored horizontally if the parameter is negative.

y
auto or length or ratio
Settable
Default: 100%
The vertical scaling factor.

The body will be mirrored vertically if the parameter is negative.

origin
alignment
Settable
Default: center + horizon
The origin of the transformation.

reflow
bool
Settable
Default: false
Whether the scaling impacts the layout.

If set to false, the scaled content will be allowed to overlap other content. If set to true, it will compute the new size of the scaled content and adjust the layout accordingly.

body
content
Required
Positional
The content to scale.
