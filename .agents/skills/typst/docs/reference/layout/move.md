move
Element
Moves content without affecting layout.

The move function allows you to move content while the layout still ‘sees’ it at the original positions. Containers will still be sized as if the content was not moved.

Example
#rect(inset: 0pt, fill: gray, move(
dx: 4pt, dy: 6pt,
rect(
inset: 8pt,
fill: white,
stroke: black,
[Abra cadabra]
)
))

Accessibility
Moving is transparent to Assistive Technology (AT). Your content will be read in the order it appears in the source, regardless of any visual movement. If you need to hide content from AT altogether in PDF export, consider using pdf.artifact.

Parameters
move(
dx: relative,
dy: relative,
content,
) → content
dx
relative
Settable
Default: 0% + 0pt
The horizontal displacement of the content.

dy
relative
Settable
Default: 0% + 0pt
The vertical displacement of the content.

body
content
Required
Positional
The content to move.
