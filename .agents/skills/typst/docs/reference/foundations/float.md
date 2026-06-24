float
A floating-point number.

A limited-precision representation of a real number. Typst uses 64 bits to store floats. Wherever a float is expected, you can also pass an integer.

You can convert a value to a float with this type’s constructor.

NaN and positive infinity are available as float.nan and float.inf respectively.

Example
#3.14 \
#1e4 \
#(10 / 4)

Constructor
Converts a value to a float.

Booleans are converted to 0.0 or 1.0.
Integers are converted to the closest 64-bit float. For integers with absolute value less than calc.pow(2, 53), this conversion is exact.
Ratios are divided by 100%.
Strings are parsed in base 10 to the closest 64-bit float. Exponential notation is supported.
float(
bool
int
float
ratio
decimal
str
) → float
value
bool or int or float or ratio or decimal or str
Required
Positional
The value that should be converted to a float.

Definitions
is-nan
Checks if a float is not a number.

In IEEE 754, more than one bit pattern represents a NaN. This function returns true if the float is any of those bit patterns.

self.is-nan() → bool
is-infinite
Checks if a float is infinite.

Floats can represent positive infinity and negative infinity. This function returns true if the float is an infinity.

self.is-infinite() → bool
signum
Calculates the sign of a floating point number.

If the number is positive (including +0.0), returns 1.0.
If the number is negative (including -0.0), returns -1.0.
If the number is NaN, returns float.nan.
self.signum() → float
from-bytes
Interprets bytes as a float.

float.from-bytes(
bytes,
endian: str,
) → float
bytes
bytes
Required
Positional
The bytes that should be converted to a float.

Must have a length of either 4 or 8. The bytes are then interpreted in IEEE 754′s binary32 (single-precision) or binary64 (double-precision) format depending on the length of the bytes.

endian
str
Default: "little"
The endianness of the conversion.

Variant Details
"big" Big-endian byte order: The highest-value byte is at the beginning of the bytes.
"little" Little-endian byte order: The lowest-value byte is at the beginning of the bytes.
to-bytes
Converts a float to bytes.

self.to-bytes(
endian: str,
size: int,
) → bytes
endian
str
Default: "little"
The endianness of the conversion.

Variant Details
"big" Big-endian byte order: The highest-value byte is at the beginning of the bytes.
"little" Little-endian byte order: The lowest-value byte is at the beginning of the bytes.
size
int
Default: 8
The size of the resulting bytes.

This must be either 4 or 8. The call will return the representation of this float in either IEEE 754′s binary32 (single-precision) or binary64 (double-precision) format depending on the provided size.
