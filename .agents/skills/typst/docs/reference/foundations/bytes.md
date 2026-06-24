bytes
A sequence of bytes.

This is conceptually similar to an array of integers between 0 and 255, but represented much more efficiently. You can iterate over it using a for loop.

You can convert

a string or an array of integers to bytes with the bytes constructor
bytes to a string with the str constructor, with UTF-8 encoding
bytes to an array of integers with the array constructor
When reading data from a file, you can decide whether to load it as a string or as raw bytes.

#bytes((123, 160, 22, 0)) \
#bytes("Hello 😃")

#let data = read(
"rhino.png",
encoding: none,
)

// Magic bytes.
#array(data.slice(0, 4)) \
#str(data.slice(1, 4))

Constructor
Converts a value to bytes.

Strings are encoded in UTF-8.
Arrays of integers between 0 and 255 are converted directly. The dedicated byte representation is much more efficient than the array representation and thus typically used for large byte buffers (e.g. image data).
bytes(
str
bytes
array
) → bytes
value
str or bytes or array
Required
Positional
The value that should be converted to bytes.

Definitions
len
The length in bytes.

self.len() → int
at
Returns the byte at the specified index. Returns the default value if the index is out of bounds or fails with an error if no default value was specified.

self.at(
int,
default: any,
) → any
index
int
Required
Positional
The index at which to retrieve the byte.

default
any
A default value to return if the index is out of bounds.

slice
Extracts a subslice of the bytes. Fails with an error if the start or end index is out of bounds.

self.slice(
int,
noneint,
count: int,
) → bytes
start
int
Required
Positional
The start index (inclusive).

end
none or int
Positional
Default: none
The end index (exclusive). If omitted, the whole slice until the end is extracted.

count
int
The number of items to extract. This is equivalent to passing start + count as the end position. Mutually exclusive with end.
