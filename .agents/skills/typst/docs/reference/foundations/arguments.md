arguments
Captured arguments to a function.

Arguments are either positional or named, and can be accessed through the pos, named, and at methods.

Additionally, named arguments can be accessed with field syntax similar to dictionaries.

Argument Sinks
Like built-in functions, custom functions can also take a variable number of arguments. You can specify an argument sink which collects all excess arguments as ..sink. The resulting sink value is of the arguments type. It exposes methods to access the positional and named arguments.

#let format(title, ..authors) = {
let by = authors
.pos()
.join(", ", last: " and ")

[*#title* \ _Written by #by;_]
}

#format("ArtosFlow", "Jane", "Joe")

Spreading
Inversely to an argument sink, you can spread arguments, arrays and dictionaries into a function call with the ..spread operator:

#let array = (2, 3, 5)
#calc.min(..array)
#let dict = (fill: blue)
#text(..dict)[Hello]

Constructor
Construct spreadable arguments in place.

This function behaves like let args(..sink) = sink.

arguments(..
any
) → arguments
arguments
any
Required
Positional
Variadic
The arguments to construct.

Definitions
len
The number of arguments, positional or named.

self.len() → int
at
Returns the positional argument at the specified index, or the named argument with the specified name.

If the key is an integer, this is equivalent to first calling pos and then array.at. If it is a string, this is equivalent to first calling named and then dictionary.at.

Named arguments can also be accessed with field syntax (e.g. arguments(key: 42).key) if no default is needed. Unlike dictionaries, fields on arguments cannot be modified.

self.at(
intstr,
default: any,
) → any
key
int or str
Required
Positional
The index or name of the argument to get.

default
any
A default value to return if the key is invalid.

pos
Returns the captured positional arguments as an array.

self.pos() → array
named
Returns the captured named arguments as a dictionary.

self.named() → dictionary
filter
Produces a new arguments with only the arguments for which the value passes the test.

self.filter(
function
) → arguments
test
function
Required
Positional
The function to apply to each value. Must return a boolean.

map
Produces a new arguments by transforming each argument value with the passed function.

self.map(
function
) → arguments
mapper
function
Required
Positional
The function to apply to each value.
