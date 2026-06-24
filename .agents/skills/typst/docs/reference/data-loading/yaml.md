yaml
Reads structured data from a YAML file.

The file must contain a valid YAML object or array. The YAML values will be converted into corresponding Typst values as listed in the table below.

The function returns a dictionary, an array or, depending on the YAML file, another YAML data type.

The YAML files in the example contain objects with authors as keys, each with a sequence of their own submapping with the keys “title” and “published”.

Example
#let bookshelf(contents) = {
for (author, works) in contents {
author
for work in works [
- #work.title (#work.published)
]
}
}

#bookshelf(
yaml("scifi-authors.yaml")
)

Conversion details
YAML value Converted into Typst
null-values (null, ~ or empty ) none
boolean bool
number float or int
string str
sequence array
mapping dictionary
Typst value Converted into YAML
types that can be converted from YAML corresponding YAML value
bytes string via repr
symbol string
content a mapping describing the content
other types (length, etc.) string via repr
Notes
In most cases, YAML numbers will be converted to floats or integers depending on whether they are whole numbers. However, be aware that integers larger than 263−1 or smaller than −263 will be converted to floating-point numbers, which may result in an approximative value.

Custom YAML tags are ignored, though the loaded value will still be present.

Bytes are not encoded as YAML sequences for performance and readability reasons. Consider using cbor.encode for binary data.

The repr function is for debugging purposes only, and its output is not guaranteed to be stable across Typst versions.

Parameters
yaml(
str
path
bytes
) → any
source
str or path or bytes
Required
Positional
A path to a YAML file or raw YAML bytes.

Definitions
encode
Encode structured data into a YAML string.

yaml.encode(
any
) → str
value
any
Required
Positional
Value to be encoded.
