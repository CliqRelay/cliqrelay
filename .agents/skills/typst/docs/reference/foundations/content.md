content
A piece of document content.

This type is at the heart of Typst. All markup you write and most functions you call produce content values. You can create a content value by enclosing markup in square brackets. This is also how you pass content to functions.

Example
Type of _Hello!_ is
#type([*Hello!*])

Content can be added with the + operator, joined together and multiplied with integers. Wherever content is expected, you can also pass a string or none.

Representation
Content consists of elements with fields. When constructing an element with its element function, you provide these fields as arguments and when you have a content value, you can access its fields with field access syntax.

Some fields are required: These must be provided when constructing an element and as a consequence, they are always available through field access on content of that type. Required fields are marked as such in the documentation.

Most fields are optional: Like required fields, they can be passed to the element function to configure them for a single element. However, these can also be configured with set rules to apply them to all elements within a scope. Optional fields are only available with field access syntax when they were explicitly passed to the element function, not when they result from a set rule.

Each element has a default appearance. However, you can also completely customize its appearance with a show rule. The show rule is passed the element. It can access the element’s field and produce arbitrary content from it.

In the web app, you can hover over a content variable to see exactly which elements the content is composed of and what fields they have. Alternatively, you can inspect the output of the repr function.

Definitions
func
The content’s element function. This function can be used to create the element contained in this content. It can be used in set and show rules for the element. Can be compared with global functions to check whether you have a specific kind of element.

self.func() → function
has
Whether the content has the specified field.

self.has(
str
) → bool
field
str
Required
Positional
The field to look for.

at
Access the specified field on the content. Returns the default value if the field does not exist or fails with an error if no default value was specified.

self.at(
str,
default: any,
) → any
field
str
Required
Positional
The field to access.

default
any
A default value to return if the field does not exist.

fields
Returns the fields of this content.

self.fields() → dictionary
location
The location of the content. This is only available on content returned by query or provided by a show rule, for other content it will be none. The resulting location can be used with counters, state and queries.

self.location() → nonelocation
