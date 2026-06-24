cbor
Reads structured data from a CBOR file.

The file must contain a valid CBOR serialization. The CBOR values will be converted into corresponding Typst values as listed in the table below.

The function returns a dictionary, an array or, depending on the CBOR file, another CBOR data type.

Conversion details
CBOR value Converted into Typst
integer int (or float)
bytes bytes
float float
text str
bool bool
null none
array array
map dictionary
Typst value Converted into CBOR
types that can be converted from CBOR corresponding CBOR value
symbol text
content a map describing the content
other types (length, etc.) text via repr
Notes
Be aware that CBOR integers larger than 263−1 or smaller than −263 will be converted to floating point numbers, which may result in an approximative value.

CBOR tags are not supported, and an error will be thrown.

The repr function is for debugging purposes only, and its output is not guaranteed to be stable across Typst versions.

Parameters
cbor(
str
path
bytes
) → any
source
str or path or bytes
Required
Positional
A path to a CBOR file or raw CBOR bytes.

Definitions
encode
Encode structured data into CBOR bytes.

cbor.encode(
any
) → bytes
value
any
Required
Positional
Value to be encoded.
