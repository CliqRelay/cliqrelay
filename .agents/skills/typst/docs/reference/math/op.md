op
Element
A text operator in an equation.

Example
$ tan x = (sin x)/(cos x) $
$ op("custom",
limits: #true)\_(n->oo) n $

Predefined Operators
Typst predefines the operators arccos, arcsin, arctan, arg, cos, cosh, cot, coth, csc, csch, ctg, deg, det, dim, exp, gcd, lcm, hom, id, im, inf, ker, lg, lim, liminf, limsup, ln, log, max, min, mod, Pr, sec, sech, sin, sinc, sinh, sup, tan, tanh, tg and tr.

Parameters
op(
content,
limits: bool,
) → content
text
content
Required
Positional
The operator’s text.

limits
bool
Settable
Default: false
Whether the operator should show attachments as limits in display mode.
