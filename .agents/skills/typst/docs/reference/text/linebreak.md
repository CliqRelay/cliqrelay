linebreak
Element
Inserts a line break.

Advances the paragraph to the next line. A single trailing line break at the end of a paragraph is ignored, but more than one creates additional empty lines.

Example
_Date:_ 26.12.2022 \
_Topic:_ Infrastructure Test \
_Severity:_ High \

Syntax
This function also has dedicated syntax: To insert a line break, simply write a backslash followed by whitespace. This always creates an unjustified break.

Parameters
linebreak(
justify
:
bool
) → content
justify
bool
Settable
Default: false
Whether to justify the line before the break.

This is useful if you found a better line break opportunity in your justified text than Typst did.
