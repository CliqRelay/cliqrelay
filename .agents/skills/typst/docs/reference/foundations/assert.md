assert
Ensures that a condition is fulfilled.

Fails with an error if the condition is not fulfilled. Does not produce any output in the document.

If you wish to test equality between two values, see assert.eq and assert.ne.

Example
#assert(1 < 2, message: "math broke")
Parameters
assert(
bool,
message: str,
) → none
condition
bool
Required
Positional
The condition that must be true for the assertion to pass.

message
str
The error message when the assertion fails.

Definitions
eq
Ensures that two values are equal.

Fails with an error if the first value is not equal to the second. Does not produce any output in the document.

#assert.eq(10, 10)
assert.eq(
any,
any,
message: str,
) → none
left
any
Required
Positional
The first value to compare.

right
any
Required
Positional
The second value to compare.

message
str
An optional message to display on error instead of the representations of the compared values.

ne
Ensures that two values are not equal.

Fails with an error if the first value is equal to the second. Does not produce any output in the document.

#assert.ne(3, 4)
assert.ne(
any,
any,
message: str,
) → none
left
any
Required
Positional
The first value to compare.

right
any
Required
Positional
The second value to compare.

message
str
An optional message to display on error instead of the representations of the compared values.
