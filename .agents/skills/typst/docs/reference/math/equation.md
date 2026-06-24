equation
Element
A mathematical equation.

Can be displayed inline with text or as a separate block. An equation becomes block-level through the presence of whitespace after the opening dollar sign and whitespace before the closing dollar sign.

Example
#set text(font: "New Computer Modern")

Let $a$, $b$, and $c$ be the side
lengths of a right-angled triangle.
Then, we know that:
$ a^2 + b^2 = c^2 $

Prove by induction:
$ sum\_(k=1)^n k = (n(n+1)) / 2 $

By default, block-level equations will not break across pages. This can be changed through show math.equation: set block(breakable: true).

Syntax
This function also has dedicated syntax: Write mathematical markup within dollar signs to create an equation. Starting and ending the equation with whitespace lifts it into a separate block that is centered horizontally. For more details about math syntax, see the main math page.

Parameters
equation(
block: bool,
numbering: nonestrfunction,
number-align: alignment,
supplement: noneautocontentfunction,
alt: nonestr,
content,
) → content
block
bool
Settable
Default: false
Whether the equation is displayed as a separate block.

numbering
none or str or function
Settable
Default: none
How to number block-level equations. Accepts a numbering pattern or function taking a single number.

number-align
alignment
Settable
Default: end + horizon
The alignment of the equation numbering.

By default, the alignment is end + horizon. For the horizontal component, you can use right, left, or start and end of the text direction; for the vertical component, you can use top, horizon, or bottom.

supplement
none or auto or content or function
Settable
Default: auto
A supplement for the equation.

For references to equations, this is added before the referenced number.

If a function is specified, it is passed the referenced equation and should return content.

alt
none or str
Settable
Default: none
An alternative description of the mathematical equation.

This should describe the full equation in natural language and will be made available to Assistive Technology. You can learn more in the Textual Representations section of the Accessibility Guide.

body
content
Required
Positional
The contents of the equation.
