read
Reads plain text or data from a file.

By default, the file will be read as UTF-8 and returned as a string.

If you specify encoding: none, this returns raw bytes instead.

Example
An example for a HTML file: \
#let text = read("example.html")
#raw(text, block: true, lang: "html")

Raw bytes:
#read("tiger.jpg", encoding: none)

Parameters
read(
strpath,
encoding: nonestr,
) → strbytes
path
str or path
Required
Positional
Path to a file.

encoding
none or str
Default: "utf8"
The encoding to read the file with.

If set to none, this function returns raw bytes.

Variant Details
"utf8" The Unicode UTF-8 encoding.
