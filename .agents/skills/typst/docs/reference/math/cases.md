cases
Element
A case distinction.

Content across different branches can be aligned with the & symbol.

Example
$ f(x, y) := cases(
1 "if" (x dot y)/2 <= 0,
2 "if" x "is even",
3 "if" x in NN,
4 "else",
) $

Parameters
cases(
delim: nonestrsymbolarray,
reverse: bool,
gap: relative,
..content,
) → content
delim
none or str or symbol or array
Settable
Default: ("{", "}")
The delimiter to use.

Can be a single character specifying the left delimiter, in which case the right delimiter is inferred. Otherwise, can be an array containing a left and a right delimiter.

reverse
bool
Settable
Default: false
Whether the direction of cases should be reversed.

gap
relative
Settable
Default: 0% + 0.2em
The gap between branches.

children
content
Required
Positional
Variadic
The branches of the case distinction.
