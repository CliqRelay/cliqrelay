frac
Element
A mathematical fraction.

Example
$ 1/2 < (x+1)/2 $
$ ((x+1)) / 2 = frac(a, b) $

Syntax
This function also has dedicated syntax: Use a slash to turn neighbouring expressions into a fraction. Multiple atoms can be grouped into a single expression using round grouping parentheses. Such parentheses are removed from the output, but you can nest multiple to force them.

Parameters
frac(
content,
content,
style: str,
) → content
num
content
Required
Positional
The fraction’s numerator.

denom
content
Required
Positional
The fraction’s denominator.

style
str
Settable
Default: "vertical"
How the fraction should be laid out.

Variant Details
"vertical" Stacked numerator and denominator with a bar.
"skewed" Numerator and denominator separated by a slash.
"horizontal" Numerator and denominator placed inline and parentheses are not absorbed.
