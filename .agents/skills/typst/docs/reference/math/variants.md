Variants
Alternate typefaces within formulas.

These functions are distinct from the text function because math fonts contain multiple variants of each letter.

Functions
serif
Serif (roman) font style in math.

This is already the default.

math.serif(
content
) → content
body
content
Required
Positional
The content to style.

sans
Sans-serif font style in math.

math.sans(
content
) → content
body
content
Required
Positional
The content to style.

frak
Fraktur font style in math.

math.frak(
content
) → content
body
content
Required
Positional
The content to style.

mono
Monospace font style in math.

math.mono(
content
) → content
body
content
Required
Positional
The content to style.

bb
Blackboard bold (double-struck) font style in math.

For uppercase latin letters, blackboard bold is additionally available through symbols of the form NN and RR.

math.bb(
content
) → content
body
content
Required
Positional
The content to style.

cal
Calligraphic (chancery) font style in math.

This is the default calligraphic/script style for most math fonts. See scr for more on how to get the other style (roundhand).

math.cal(
content
) → content
body
content
Required
Positional
The content to style.

scr
Script (roundhand) font style in math.

There are two ways that fonts can support differentiating cal and scr. The first is using Unicode variation sequences. This works out of the box in Typst, however only a few math fonts currently support this.

The other way is using font features. For example, the roundhand style might be available in a font through the stylistic set 1 (ss01) feature. To use it in Typst, you could then define your own version of scr like in the example below.

math.scr(
content
) → content
body
content
Required
Positional
The content to style.
