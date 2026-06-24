Left/Right
Delimiter matching.

The lr function allows you to match two delimiters and scale them with the content they contain. While this also happens automatically for delimiters that match syntactically, lr allows you to match two arbitrary delimiters and control their size exactly. Apart from the lr function, Typst provides a few more functions that create delimiter pairings for absolute, ceiled, and floored values as well as norms.

To prevent a delimiter from being matched by Typst, and thus auto-scaled, escape it with a backslash. To instead disable auto-scaling completely, use set math.lr(size: 1em).

Example
$ [a, b/2] $
$ lr(]sum\_(x=1)^n], size: #50%) x $
$ abs((x + y) / 2) $
$ \{ (x / y) \} $
#set math.lr(size: 1em)
$ { (a / b), a, b in (0; 1/2] } $

Functions
lr
Element
Scales delimiters.

While matched delimiters scale by default, this can be used to scale unmatched delimiters and to control the delimiter scaling more precisely.

math.lr(
size: relative,
content,
) → content
size
relative
Settable
Default: 100% + 0pt
The size of the brackets, relative to the height of the wrapped content.

body
content
Required
Positional
The delimited content, including the delimiters.

mid
Element
Scales delimiters vertically to the nearest surrounding lr() group.

math.mid(
content
) → content
body
content
Required
Positional
The content to be scaled.

abs
Takes the absolute value of an expression.

math.abs(
size: relative,
content,
) → content
size
relative
The size of the brackets, relative to the height of the wrapped content.

Default: The current value of lr.size.

body
content
Required
Positional
The expression to take the absolute value of.

norm
Takes the norm of an expression.

math.norm(
size: relative,
content,
) → content
size
relative
The size of the brackets, relative to the height of the wrapped content.

Default: The current value of lr.size.

body
content
Required
Positional
The expression to take the norm of.

floor
Floors an expression.

math.floor(
size: relative,
content,
) → content
size
relative
The size of the brackets, relative to the height of the wrapped content.

Default: The current value of lr.size.

body
content
Required
Positional
The expression to floor.

ceil
Ceils an expression.

math.ceil(
size: relative,
content,
) → content
size
relative
The size of the brackets, relative to the height of the wrapped content.

Default: The current value of lr.size.

body
content
Required
Positional
The expression to ceil.

round
Rounds an expression.

math.round(
size: relative,
content,
) → content
size
relative
The size of the brackets, relative to the height of the wrapped content.

Default: The current value of lr.size.

body
content
Required
Positional
The expression to round.
