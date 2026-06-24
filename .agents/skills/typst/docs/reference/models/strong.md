strong
Element
Strongly emphasizes content by increasing the font weight.

Increases the current font weight by a given delta.

Example
This is _strong._ \
This is #strong[too.] \

#show strong: set text(red)
And this is _evermore._

Syntax
This function also has dedicated syntax: To strongly emphasize content, simply enclose it in stars/asterisks (\*). Note that this only works at word boundaries. To strongly emphasize part of a word, you have to use the function.

Parameters
strong(
delta: int,
content,
) → content
delta
int
Settable
Default: 300
The delta to apply on the font weight.

body
content
Required
Positional
The content to strongly emphasize.
