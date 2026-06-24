metadata
Element
Exposes a value to the query system without producing visible content.

This element can be retrieved with the query function and from the command line with typst query. Its purpose is to expose an arbitrary value to the introspection system. To identify a metadata value among others, you can attach a label to it and query for that label.

The metadata element is especially useful for command line queries because it allows you to expose arbitrary values to the outside world.

// Put metadata somewhere.
#metadata("This is a note") <note>

// And find it from anywhere else.
#context {
query(<note>).first().value
}

Parameters
metadata(
any
) → content
value
any
Required
Positional
The value to embed into the document.
