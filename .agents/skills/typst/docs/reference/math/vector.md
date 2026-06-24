vec
Element
A column vector.

Content in the vector’s elements can be aligned with the align parameter, or the & symbol.

This function is for typesetting vector components. To typeset a symbol that represents a vector, arrow and bold are commonly used.

Example
$ vec(a, b, c) dot vec(1, 2, 3)
= a + 2b + 3c $

Parameters
vec(
delim: nonestrsymbolarray,
align: alignment,
gap: relative,
..content,
) → content
delim
none or str or symbol or array
Settable
Default: ("(", ")")
The delimiter to use.

Can be a single character specifying the left delimiter, in which case the right delimiter is inferred. Otherwise, can be an array containing a left and a right delimiter.

align
alignment
Settable
Default: center
The horizontal alignment that each element should have.

gap
relative
Settable
Default: 0% + 0.2em
The gap between elements.

children
content
Required
Positional
Variadic
The elements of the vector.
