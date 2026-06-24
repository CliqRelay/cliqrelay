class
Element
Forced use of a certain math class.

This is useful to treat certain symbols as if they were of a different class, e.g. to make a symbol behave like a relation. The class of a symbol defines the way it is laid out, including spacing around it, and how its scripts are attached by default. Note that the latter can always be overridden using limits and scripts.

Example
#let loves = math.class(
"relation",
sym.suit.heart,
)

$x loves y and y loves 5$

Parameters
class(
str,
content,
) → content
class
str
Required
Positional
The class to apply to the content.

Variant Details
"normal" The default class for non-special things.
"punctuation" Punctuation, e.g. a comma.
"opening" An opening delimiter, e.g. (.
"closing" A closing delimiter, e.g. ).
"fence" A delimiter that is the same on both sides, e.g. |.
"large" A large operator like sum.
"relation" A relation like = or prec.
"unary" A unary operator like not.
"binary" A binary operator like times.
"vary" An operator that can be both unary or binary like +.
body
content
Required
Positional
The content to which the class is applied.
