csv
Reads structured data from a CSV file.

The CSV file will be read and parsed into a 2-dimensional array of strings: Each row in the CSV file will be represented as an array of strings, and all rows will be collected into a single array. Header rows will not be stripped.

Example
#let results = csv("example.csv")

#table(
columns: 2,
[*Condition*], [*Result*],
..results.flatten(),
)

Parameters
csv(
strpathbytes,
delimiter: str,
row-type: type,
) → array
source
str or path or bytes
Required
Positional
A path to a CSV file or raw CSV bytes.

delimiter
str
Default: ","
The delimiter that separates columns in the CSV file. Must be a single ASCII character.

row-type
type
Default: array
How to represent the file’s rows.

If set to array, each row is represented as a plain array of strings.
If set to dictionary, each row is represented as a dictionary mapping from header keys to strings. This option only makes sense when a header row is present in the CSV file.
