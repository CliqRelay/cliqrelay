version
A version with an arbitrary number of components.

The first three components have names that can be used as fields: major, minor, patch. All following components do not have names.

The list of components is semantically extended by an infinite list of zeros. This means that, for example, 0.8 is the same as 0.8.0. As a special case, the empty version (that has no components at all) is the same as 0, 0.0, 0.0.0, and so on.

The current version of the Typst compiler is available as sys.version.

You can convert a version to an array of explicitly given components using the array constructor.

Constructor
Creates a new version.

It can have any number of components (even zero).

As a practical use case, this allows comparing the current version (sys.version) to a specific one.

version(..
int
array
) → version
components
int or array
Required
Positional
Variadic
The components of the version (array arguments are flattened)

Definitions
at
Retrieves a component of a version.

The returned integer is always non-negative. Returns 0 if the version isn’t specified to the necessary length.

self.at(
int
) → int
index
int
Required
Positional
The index at which to retrieve the component. If negative, indexes from the back of the explicitly given components.
