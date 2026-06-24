pad
Element
Adds spacing around content.

The spacing can be specified for each side individually, or for all sides at once by specifying a positional argument.

Example
#set align(center)

#pad(x: 16pt, image("typing.jpg"))
_Typing speeds can be
measured in words per minute._

Parameters
pad(
left: relative,
top: relative,
right: relative,
bottom: relative,
x: relative,
y: relative,
rest: relative,
content,
) → content
left
relative
Settable
Default: 0% + 0pt
The padding at the left side.

top
relative
Settable
Default: 0% + 0pt
The padding at the top side.

right
relative
Settable
Default: 0% + 0pt
The padding at the right side.

bottom
relative
Settable
Default: 0% + 0pt
The padding at the bottom side.

x
relative
Default: 0% + 0pt
A shorthand to set left and right to the same value.

y
relative
Default: 0% + 0pt
A shorthand to set top and bottom to the same value.

rest
relative
Default: 0% + 0pt
A shorthand to set all four sides to the same value.

body
content
Required
Positional
The content to pad at the sides.
