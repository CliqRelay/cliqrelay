selector
A filter for selecting elements within the document.

To construct a selector you can:

use an element function
filter for an element function with specific fields
use a string or regular expression
use a <label>
use a location
call the selector constructor to convert any of the above types into a selector value and use the methods below to refine it
Selectors are used to apply styling rules to elements. You can also use selectors to query the document for certain types of elements.

Furthermore, you can pass a selector to several of Typst’s built-in functions to configure their behaviour. One such example is the outline where it can be used to change which elements are listed within the outline.

Multiple selectors can be combined using the methods shown below. However, not all kinds of selectors are supported in all places, at the moment.

Example
#context query(
heading.where(level: 1)
.or(heading.where(level: 2))
)

= This will be found
== So will this
=== But this will not.

Constructor
Turns a value into a selector. The following values are accepted:

An element function like a heading or figure.
A string or regular expression.
A <label>.
A location.
A more complex selector like heading.where(level: 1).
selector(
str
regex
label
selector
location
function
) → selector
target
str or regex or label or selector or location or function
Required
Positional
Can be an element function like a heading or figure, a <label> or a more complex selector like heading.where(level: 1).

Definitions
or
Selects all elements that match this or any of the other selectors.

self.or(..
str
regex
label
selector
location
function
) → selector
others
str or regex or label or selector or location or function
Required
Positional
Variadic
The other selectors to match on.

and
Selects all elements that match this and all of the other selectors.

self.and(..
str
regex
label
selector
location
function
) → selector
others
str or regex or label or selector or location or function
Required
Positional
Variadic
The other selectors to match on.

before
Returns a modified selector that will only match elements that occur before the first match of end.

Note: This selector is currently only supported with introspection functions, not in show rules.

self.before(
labelselectorlocationfunction,
inclusive: bool,
) → selector
end
label or selector or location or function
Required
Positional
The original selection will end at the first match of end.

inclusive
bool
Default: true
Whether end itself should match or not. This is only relevant if both selectors match the same type of element. Defaults to true.

after
Returns a modified selector that will only match elements that occur after the first match of start.

Note: This selector is currently only supported with introspection functions, not in show rules.

self.after(
labelselectorlocationfunction,
inclusive: bool,
) → selector
start
label or selector or location or function
Required
Positional
The original selection will start at the first match of start.

inclusive
bool
Default: true
Whether start itself should match or not. This is only relevant if both selectors match the same type of element. Defaults to true.

within
Returns a modified selector that will only match elements that are contained within any elements matching the ancestor selector.

This can also be used in combination with here to find all matches of a selector within a context expression. This can be quite useful to have an introspection return results local to some component you are building.

Note: This selector is currently only supported with introspection functions, not in show rules.

self.within(
label
selector
location
function
) → selector
ancestor
label or selector or location or function
Required
Positional
Only matches of self that are descendants of any element matching this selector will be included in the output.

An element is not considered its own ancestor.
