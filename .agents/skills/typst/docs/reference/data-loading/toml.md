toml
Reads structured data from a TOML file.

The file must contain a valid TOML table. The TOML values will be converted into corresponding Typst values as listed in the table below.

The function returns a dictionary representing the TOML table.

The TOML file in the example consists of a table with the keys title, version, and authors.

Example
#let details = toml("details.toml")

Title: #details.title \
Version: #details.version \
Authors: #(details.authors
.join(", ", last: " and "))

Conversion details
First of all, TOML documents are tables. Other values must be put in a table to be encoded or decoded.

TOML value Converted into Typst
string str
integer int
float float
boolean bool
datetime datetime
array array
table dictionary
Typst value Converted into TOML
types that can be converted from TOML corresponding TOML value
none ignored
bytes string via repr
symbol string
content a table describing the content
other types (length, etc.) string via repr
Notes
Be aware that TOML integers larger than 263−1 or smaller than −263 cannot be represented losslessly in Typst, and an error will be thrown according to the specification.

Bytes are not encoded as TOML arrays for performance and readability reasons. Consider using cbor.encode for binary data.

The repr function is for debugging purposes only, and its output is not guaranteed to be stable across Typst versions.

Parameters
toml(
str
path
bytes
) → dictionary
source
str or path or bytes
Required
Positional
A path to a TOML file or raw TOML bytes.

Definitions
encode
Encodes structured data into a TOML string.

toml.encode(
dictionary,
pretty: bool,
) → str
value
dictionary
Required
Positional
Value to be encoded.

TOML documents are tables. Therefore, only dictionaries are suitable.

pretty
bool
Default: true
Whether to pretty-print the resulting TOML.
