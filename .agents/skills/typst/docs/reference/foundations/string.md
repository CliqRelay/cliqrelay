str
A sequence of Unicode codepoints.

You can iterate over the grapheme clusters of the string using a for loop. Grapheme clusters are basically characters but keep together things that belong together, e.g. multiple codepoints that together form a flag emoji. Strings can be added with the + operator, joined together and multiplied with integers.

Typst provides utility methods for string manipulation. Many of these methods (e.g., split, trim and replace) operate on patterns: A pattern can be either a string or a regular expression. This makes the methods quite versatile.

All lengths and indices are expressed in terms of UTF-8 bytes. Indices are zero-based and negative indices wrap around to the end of the string.

You can convert a value to a string with the str constructor.

Example
#"hello world!" \
#"\"hello\n world\"!" \
#"1 2 3".split() \
#"1,2;3".split(regex("[,;]")) \
#(regex("\\d+") in "ten euros") \
#(regex("\\d+") in "10 euros")

Escape sequences
Just like in markup, you can escape a few symbols in strings:

\\ for a backslash
\" for a quote
\n for a newline
\r for a carriage return
\t for a tab
\u{1f600} for a hexadecimal Unicode escape sequence
Constructor
Converts a value to a string.

Integers are formatted in base 10. This can be overridden with the optional base parameter.
Floats are formatted in base 10 and never in exponential notation.
Negative integers and floats are formatted with the Unicode minus sign (“−” U+2212) instead of the ASCII minus sign (“-” U+002D).
From labels the name is extracted.
Bytes are decoded as UTF-8.
If you wish to convert from and to Unicode code points, see the to-unicode and from-unicode functions.

str(
intfloatdecimalstrlabelbytesversiontype,
base: int,
) → str
value
int or float or decimal or str or label or bytes or version or type
Required
Positional
The value that should be converted to a string.

base
int
Default: 10
The base (radix) to display integers in, between 2 and 36.

Definitions
len
The length of the string in UTF-8 encoded bytes.

self.len() → int
first
Extracts the first grapheme cluster of the string.

Returns the provided default value if the string is empty or fails with an error if no default value was specified.

self.first(
default
:
str
) → str
default
str
A default value to return if the string is empty.

last
Extracts the last grapheme cluster of the string.

Returns the provided default value if the string is empty or fails with an error if no default value was specified.

self.last(
default
:
str
) → str
default
str
A default value to return if the string is empty.

at
Extracts the first grapheme cluster after the specified index. Returns the default value if the index is out of bounds or fails with an error if no default value was specified.

self.at(
int,
default: any,
) → any
index
int
Required
Positional
The byte index. If negative, indexes from the back.

default
any
A default value to return if the index is out of bounds.

slice
Extracts a substring of the string. Fails with an error if the start or end index is out of bounds.

self.slice(
int,
noneint,
count: int,
) → str
start
int
Required
Positional
The start byte index (inclusive). If negative, indexes from the back.

end
none or int
Positional
Default: none
The end byte index (exclusive). If omitted, the whole slice until the end of the string is extracted. If negative, indexes from the back.

count
int
The number of bytes to extract. This is equivalent to passing start + count as the end position. Mutually exclusive with end.

clusters
Returns the grapheme clusters of the string as an array of substrings.

self.clusters() → array
codepoints
Returns the Unicode codepoints of the string as an array of substrings.

self.codepoints() → array
to-unicode
Converts a character into its corresponding code point.

str.to-unicode(
str
) → int
character
str
Required
Positional
The character that should be converted.

from-unicode
Converts a unicode code point into its corresponding string.

str.from-unicode(
int
) → str
value
int
Required
Positional
The code point that should be converted.

normalize
Normalizes the string to the given Unicode normal form.

This is useful when manipulating strings containing Unicode combining characters.

#assert.eq("é".normalize(form: "nfd"), "e\u{0301}")
#assert.eq("ſ́".normalize(form: "nfkc"), "ś")
self.normalize(
form
:
str
) → str
form
str
Default: "nfc"
Variant Details
"nfc" Canonical composition where e.g. accented letters are turned into a single Unicode codepoint.
"nfd" Canonical decomposition where e.g. accented letters are split into a separate base and diacritic.
"nfkc" Like NFC, but using the Unicode compatibility decompositions.
"nfkd" Like NFD, but using the Unicode compatibility decompositions.
contains
Whether the string contains the specified pattern.

This method also has dedicated syntax: You can write "bc" in "abcd" instead of "abcd".contains("bc").

self.contains(
str
regex
) → bool
pattern
str or regex
Required
Positional
The pattern to search for.

starts-with
Whether the string starts with the specified pattern.

self.starts-with(
str
regex
) → bool
pattern
str or regex
Required
Positional
The pattern the string might start with.

ends-with
Whether the string ends with the specified pattern.

self.ends-with(
str
regex
) → bool
pattern
str or regex
Required
Positional
The pattern the string might end with.

find
Searches for the specified pattern in the string and returns the first match as a string or none if there is no match.

self.find(
str
regex
) → nonestr
pattern
str or regex
Required
Positional
The pattern to search for.

position
Searches for the specified pattern in the string and returns the index of the first match as an integer or none if there is no match.

self.position(
str
regex
) → noneint
pattern
str or regex
Required
Positional
The pattern to search for.

match
Searches for the specified pattern in the string and returns a dictionary with details about the first match or none if there is no match.

The returned dictionary has the following keys:

start: The start offset of the match
end: The end offset of the match
text: The text that matched.
captures: An array containing a string for each matched capturing group. The first item of the array contains the first matched capturing, not the whole match! This is empty unless the pattern was a regex with capturing groups.
self.match(
str
regex
) → nonedictionary
pattern
str or regex
Required
Positional
The pattern to search for.

matches
Searches for the specified pattern in the string and returns an array of dictionaries with details about all matches. For details about the returned dictionaries, see above.

self.matches(
str
regex
) → array
pattern
str or regex
Required
Positional
The pattern to search for.

replace
Replace at most count occurrences of the given pattern with a replacement string or function (beginning from the start). If no count is given, all occurrences are replaced.

self.replace(
strregex,
strfunction,
count: int,
) → str
pattern
str or regex
Required
Positional
The pattern to search for.

replacement
str or function
Required
Positional
The string to replace the matches with or a function that gets a dictionary for each match and can return individual replacement strings.

The dictionary passed to the function has the same shape as the dictionary returned by match.

count
int
If given, only the first count matches of the pattern are replaced.

trim
Removes matches of a pattern from one or both sides of the string, once or repeatedly and returns the resulting string.

self.trim(
nonestrregex,
at: alignment,
repeat: bool,
) → str
pattern
none or str or regex
Positional
Default: none
The pattern to search for. If none, trims white spaces.

at
alignment
Can be start or end to only trim the start or end of the string. If omitted, both sides are trimmed.

repeat
bool
Default: true
Whether to repeatedly removes matches of the pattern or just once. Defaults to true.

split
Splits a string at matches of a specified pattern and returns an array of the resulting parts.

When the empty string is used as a separator, it separates every character (i.e., Unicode code point) in the string, along with the beginning and end of the string. In practice, this means that the resulting list of parts will contain the empty string at the start and end of the list.

self.split(
none
str
regex
) → array
pattern
none or str or regex
Positional
Default: none
The pattern to split at. Defaults to whitespace.

rev
Reverses the string.

More specifically, this returns a string with the same grapheme clusters, in reversed order.

self.rev() → str
