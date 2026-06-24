Sizes
Forced size styles for expressions within formulas.

These functions allow manual configuration of the size of equation elements to make them look as in a display/inline equation or as if used in a root or sub/superscripts.

Functions
display
Forced display style in math.

This is the normal size for block equations.

math.display(
content,
cramped: bool,
) → content
body
content
Required
Positional
The content to size.

cramped
bool
Default: false
Whether to impose a height restriction for exponents, like regular sub- and superscripts do.

inline
Forced inline (text) style in math.

This is the normal size for inline equations.

math.inline(
content,
cramped: bool,
) → content
body
content
Required
Positional
The content to size.

cramped
bool
Default: false
Whether to impose a height restriction for exponents, like regular sub- and superscripts do.

script
Forced script style in math.

This is the smaller size used in powers or sub- or superscripts.

math.script(
content,
cramped: bool,
) → content
body
content
Required
Positional
The content to size.

cramped
bool
Default: true
Whether to impose a height restriction for exponents, like regular sub- and superscripts do.

sscript
Forced second script style in math.

This is the smallest size, used in second-level sub- and superscripts (script of the script).

math.sscript(
content,
cramped: bool,
) → content
body
content
Required
Positional
The content to size.

cramped
bool
Default: true
Whether to impose a height restriction for exponents, like regular sub- and superscripts do.
