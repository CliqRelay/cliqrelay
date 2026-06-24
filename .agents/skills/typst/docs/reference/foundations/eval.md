eval
Evaluates a string as Typst code.

This function should only be used as a last resort.

Example
#eval("1 + 1") \
#eval("(1, 2, 3, 4)").len() \
#eval("_Markup!_", mode: "markup") \

Parameters
eval(
str,
mode: str,
scope: dictionary,
) → any
source
str
Required
Positional
A string of Typst code to evaluate.

mode
str
Default: "code"
The syntactical mode in which the string is parsed.

Variant Details
"markup" Evaluate as markup, as in a Typst file.
"math" Evaluate as math, as in an equation.
"code" Evaluate as code, as after a hash.
scope
dictionary
Default: (:)
A scope of definitions that are made available.
