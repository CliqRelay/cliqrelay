Attach
Subscript, superscripts, and limits.

Attachments can be displayed either as sub/superscripts, or limits. Typst automatically decides which is more suitable depending on the base, but you can also control this manually with the scripts and limits functions.

If you want the base to stretch to fit long top and bottom attachments (for example, an arrow with text above it), use the stretch function.

Example
$ sum\_(i=0)^n a_i = 2^(1+i) $

Syntax
This function also has dedicated syntax for attachments after the base: Use the underscore (\_) to indicate a subscript i.e. bottom attachment and the hat (^) to indicate a superscript i.e. top attachment.

Functions
attach
Element
A base with optional attachments.

If you want to add accents (hats, tildes, arrows, etc.) instead of scripts or corner attachments, use the accent function instead.

math.attach(
content,
t: nonecontent,
b: nonecontent,
tl: nonecontent,
bl: nonecontent,
tr: nonecontent,
br: nonecontent,
) → content
base
content
Required
Positional
The base to which things are attached.

t
none or content
Settable
Default: none
The top attachment, smartly positioned at top-right or above the base.

You can wrap the base in limits() or scripts() to override the smart positioning.

b
none or content
Settable
Default: none
The bottom attachment, smartly positioned at the bottom-right or below the base.

You can wrap the base in limits() or scripts() to override the smart positioning.

tl
none or content
Settable
Default: none
The top-left attachment (before the base).

bl
none or content
Settable
Default: none
The bottom-left attachment (before base).

tr
none or content
Settable
Default: none
The top-right attachment (after the base).

br
none or content
Settable
Default: none
The bottom-right attachment (after the base).

scripts
Element
Forces a base to display attachments as scripts.

math.scripts(
content
) → content
body
content
Required
Positional
The base to attach the scripts to.

limits
Element
Forces a base to display attachments as limits.

math.limits(
content,
inline: bool,
) → content
body
content
Required
Positional
The base to attach the limits to.

inline
bool
Settable
Default: true
Whether to also force limits in inline equations.

When applying limits globally (e.g., through a show rule), it is typically a good idea to disable this.
