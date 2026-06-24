locate
Contextual
Determines the location of an element in the document.

Takes a selector that must match exactly one element and returns that element’s location. This location can, in particular, be used to retrieve the physical page number and position (page, x, y) for that element.

Examples
Locating a specific element:

#context [
Introduction is at: \
 #locate(<intro>).position()
]

= Introduction <intro>

Parameters
locate(
label
selector
location
function
) → location
selector
label or selector or location or function
Required
Positional
A selector that should match exactly one element. This element will be located.

Especially useful in combination with

here to locate the current context,
a location retrieved from some queried element via the location() method on content.
