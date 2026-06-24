module
A collection of variables and functions that are commonly related to a single theme.

A module can

be built-in
stem from a file import
stem from a package import (and thus indirectly its entrypoint file)
result from a call to the plugin function
You can access definitions from the module using field access notation and interact with it using the import and include syntaxes.

#import "utils.typ"
#utils.add(2, 5)

#import utils: sub
#sub(1, 4)

You can check whether a definition is present in a module using the in operator, with a string on the left-hand side. This can be useful to conditionally access definitions in a module.

#("table" in std) \
#("nope" in std)

Alternatively, it is possible to convert a module to a dictionary, and therefore access its contents dynamically, using the dictionary constructor.
