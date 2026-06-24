int
An integer: a positive whole number, a negative whole number, or zero.

Typst stores signed integers with the two’s complement representation in 64 bits. This allows storing numbers up to
2
63
−
1
or 9223372036854775807, and down to
−
2
63
or -9223372036854775808. These values are accessible as int.max and int.min.

Integers can also be specified as hexadecimal, octal, or binary by starting with the prefixes: 0x, 0o, or 0b.

You can convert a value to an integer with this type’s constructor.

Example
#(1 + 2) \
#(2 - 5) \
#(3 + 4 < 8)

#0xff \
#0o10 \
#0b1001

#(int(3.8) + int("26"))

/ Max: #int.max
/ Min: #int.min

Constructor
Converts a value to an integer. Raises an error if there is an attempt to parse an invalid string or produce an integer that doesn’t fit into a 64-bit signed integer.

Booleans are converted to 0 or 1.
Floats and decimals are rounded to the next 64-bit integer towards zero.
Strings are parsed in base 10 by default.
int(
boolintfloatdecimalstr,
base: int,
) → int
value
bool or int or float or decimal or str
Required
Positional
The value that should be converted to an integer.

base
int
Default: 10
The base (radix) for parsing strings, between 2 and 36.

Definitions
signum
Calculates the sign of an integer.

If the number is positive, returns 1.
If the number is negative, returns -1.
If the number is zero, returns 0.
self.signum() → int
bit-not
Calculates the bitwise NOT of an integer.

For the purposes of this function, the operand is treated as a signed integer of 64 bits.

self.bit-not() → int
bit-and
Calculates the bitwise AND between two integers.

For the purposes of this function, the operands are treated as signed integers of 64 bits.

self.bit-and(
int
) → int
rhs
int
Required
Positional
The right-hand operand of the bitwise AND.

bit-or
Calculates the bitwise OR between two integers.

For the purposes of this function, the operands are treated as signed integers of 64 bits.

self.bit-or(
int
) → int
rhs
int
Required
Positional
The right-hand operand of the bitwise OR.

bit-xor
Calculates the bitwise XOR between two integers.

For the purposes of this function, the operands are treated as signed integers of 64 bits.

self.bit-xor(
int
) → int
rhs
int
Required
Positional
The right-hand operand of the bitwise XOR.

bit-lshift
Shifts the operand’s bits to the left by the specified amount.

For the purposes of this function, the operand is treated as a signed integer of 64 bits. An error will occur if the result is too large to fit in a 64-bit integer.

self.bit-lshift(
int
) → int
shift
int
Required
Positional
The amount of bits to shift. Must not be negative.

bit-rshift
Shifts the operand’s bits to the right by the specified amount. Performs an arithmetic shift by default (extends the sign bit to the left, such that negative numbers stay negative), but that can be changed by the logical parameter.

For the purposes of this function, the operand is treated as a signed integer of 64 bits.

self.bit-rshift(
int,
logical: bool,
) → int
shift
int
Required
Positional
The amount of bits to shift. Must not be negative.

Shifts larger than 63 are allowed and will cause the return value to saturate. For non-negative numbers, the return value saturates at 0, while, for negative numbers, it saturates at -1 if logical is set to false, or 0 if it is true. This behavior is consistent with just applying this operation multiple times. Therefore, the shift will always succeed.

logical
bool
Default: false
Toggles whether a logical (unsigned) right shift should be performed instead of arithmetic right shift. If this is true, negative operands will not preserve their sign bit, and bits which appear to the left after the shift will be 0. This parameter has no effect on non-negative operands.

from-bytes
Converts bytes to an integer.

int.from-bytes(
bytes,
endian: str,
signed: bool,
) → int
bytes
bytes
Required
Positional
The bytes that should be converted to an integer.

Must be of length at most 8 so that the result fits into a 64-bit signed integer.

endian
str
Default: "little"
The endianness of the conversion.

Variant Details
"big" Big-endian byte order: The highest-value byte is at the beginning of the bytes.
"little" Little-endian byte order: The lowest-value byte is at the beginning of the bytes.
signed
bool
Default: true
Whether the bytes should be treated as a signed integer. If this is true and the most significant bit is set, the resulting number will negative.

to-bytes
Converts an integer to bytes.

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
The size in bytes of the resulting bytes (must be at least zero). If the integer is too large to fit in the specified size, the conversion will truncate the remaining bytes based on the endianness. To keep the same resulting value, if the endianness is big-endian, the truncation will happen at the rightmost bytes. Otherwise, if the endianness is little-endian, the truncation will happen at the leftmost bytes.

Be aware that if the integer is negative and the size is not enough to make the number fit, when passing the resulting bytes to int.from-bytes, the resulting number might be positive, as the most significant bit might not be set to 1.
