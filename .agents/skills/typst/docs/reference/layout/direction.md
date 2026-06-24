direction
The four directions into which content can be laid out.

Possible values are:

ltr: Left to right.
rtl: Right to left.
ttb: Top to bottom.
btt: Bottom to top.
These values are available globally and also in the direction type’s scope, so you can write either of the following two:

#stack(dir: rtl)[A][B][C]
#stack(dir: direction.rtl)[A][B][C]

Definitions
from
Returns a direction from a starting point.

direction.from(
alignment
) → direction
side
alignment
Required
Positional
Positional parameters are specified in order, without names.
to
Returns a direction from an end point.

direction.to(
alignment
) → direction
side
alignment
Required
Positional
axis
The axis this direction belongs to, either "horizontal" or "vertical".

self.axis() → str
sign
The corresponding sign, for use in calculations.

self.sign() → int
start
The start point of this direction, as an alignment.

self.start() → alignment
end
The end point of this direction, as an alignment.

self.end() → alignment
inv
The inverse direction.

self.inv() → direction
