Calculation
Module for calculations and processing of numeric values.

These definitions are part of the calc module and not imported by default. In addition to the functions listed below, the calc module also defines the constants pi, tau, e, and inf.

Functions
abs
Calculates the absolute value of a numeric value.

calc.abs(
int
float
length
angle
ratio
fraction
decimal
) → any
value
int or float or length or angle or ratio or fraction or decimal
Required
Positional
The value whose absolute value to calculate.

pow
Raises a value to some exponent.

calc.pow(
intfloatdecimal,
intfloat,
) → intfloatdecimal
base
int or float or decimal
Required
Positional
The base of the power.

If this is a decimal, the exponent can only be an integer.

exponent
int or float
Required
Positional
The exponent of the power.

exp
Raises a value to some exponent of
𝑒
.

calc.exp(
int
float
) → float
exponent
int or float
Required
Positional
The exponent of the power.

sqrt
Calculates the square root of a number.

calc.sqrt(
int
float
) → float
value
int or float
Required
Positional
The number whose square root to calculate. Must be non-negative.

root
Calculates the real
𝑛
th root of a number.

If the number is negative, then
𝑛
must be odd.

calc.root(
float,
int,
) → float
radicand
float
Required
Positional
The expression to take the root of.

index
int
Required
Positional
The value of
𝑛
.

sin
Calculates the sine of an angle.

When called with an integer or a float, they will be interpreted as radians.

calc.sin(
int
float
angle
) → float
angle
int or float or angle
Required
Positional
The angle whose sine to calculate.

cos
Calculates the cosine of an angle.

When called with an integer or a float, they will be interpreted as radians.

calc.cos(
int
float
angle
) → float
angle
int or float or angle
Required
Positional
The angle whose cosine to calculate.

tan
Calculates the tangent of an angle.

When called with an integer or a float, they will be interpreted as radians.

calc.tan(
int
float
angle
) → float
angle
int or float or angle
Required
Positional
The angle whose tangent to calculate.

asin
Calculates the arcsine of a number.

calc.asin(
int
float
) → angle
value
int or float
Required
Positional
The number whose arcsine to calculate. Must be between
−
1
and
1
.

acos
Calculates the arccosine of a number.

calc.acos(
int
float
) → angle
value
int or float
Required
Positional
The number whose arccosine to calculate. Must be between
−
1
and
1
.

atan
Calculates the arctangent of a number.

calc.atan(
int
float
) → angle
value
int or float
Required
Positional
The number whose arctangent to calculate.

atan2
Calculates the four-quadrant arctangent of a coordinate.

The four-quadrant arctangent of
(
𝑥
,
𝑦
)
is defined as the argument of the complex number
𝑥

- 𝑖
  𝑦
  .

Returns an angle between -180deg and 180deg.

Note that this function accepts
(
𝑥
,
𝑦
)
, not
(
𝑦
,
𝑥
)
.

calc.atan2(
intfloat,
intfloat,
) → angle
x
int or float
Required
Positional
The
𝑥
coordinate.

y
int or float
Required
Positional
The
𝑦
coordinate.

sinh
Calculates the hyperbolic sine of a hyperbolic angle.

The hyperbolic sine of
𝑥
is defined as follows:

𝑒
𝑥
−
𝑒
−
𝑥
2
calc.sinh(
float
) → float
value
float
Required
Positional
The hyperbolic angle whose hyperbolic sine to calculate.

cosh
Calculates the hyperbolic cosine of a hyperbolic angle.

The hyperbolic cosine of
𝑥
is defined as follows:

𝑒
𝑥

- 𝑒
  −
  𝑥
  2
  calc.cosh(
  float
  ) → float
  value
  float
  Required
  Positional
  The hyperbolic angle whose hyperbolic cosine to calculate.

tanh
Calculates the hyperbolic tangent of a hyperbolic angle.

The hyperbolic tangent of
𝑥
is defined as follows:

𝑒
𝑥
−
𝑒
−
𝑥
𝑒
𝑥

- 𝑒
  −
  𝑥
  calc.tanh(
  float
  ) → float
  value
  float
  Required
  Positional
  The hyperbolic angle whose hyperbolic tangent to calculate.

asinh
Calculates the inverse hyperbolic sine of a number.

The inverse hyperbolic sine of
𝑥
is defined as follows:

ln
(
𝑥

- 𝑥
  2
- 1
  )
  calc.asinh(
  float
  ) → float
  value
  float
  Required
  Positional
  The number whose inverse hyperbolic sine to calculate.

acosh
Calculates the inverse hyperbolic cosine of a number.

The inverse hyperbolic cosine of
𝑥
is defined as follows:

ln
(
𝑥

- 𝑥
  2
  −
  1
  )
  calc.acosh(
  float
  ) → float
  value
  float
  Required
  Positional
  The number whose inverse hyperbolic cosine to calculate. Must be greater than or equal to
  1
  .

atanh
Calculates the inverse hyperbolic tangent of a number.

The inverse hyperbolic tangent of
𝑥
is defined as follows:

1
2
ln
(
1

- 𝑥
  1
  −
  𝑥
  )
  calc.atanh(
  float
  ) → float
  value
  float
  Required
  Positional
  The number whose inverse hyperbolic tangent to calculate. Must be between
  −
  1
  and
  1
  (exclusive).

log
Calculates the logarithm of a number.

If the base is not specified, the logarithm is calculated in base ten.

calc.log(
intfloat,
base: float,
) → float
value
int or float
Required
Positional
The number whose logarithm to calculate. Must be strictly positive.

base
float
Default: 10.0
The base of the logarithm. May not be zero.

ln
Calculates the natural logarithm of a number.

calc.ln(
int
float
) → float
value
int or float
Required
Positional
The number whose logarithm to calculate. Must be strictly positive.

erf
Applies the error function to a number.

The value of the error function at
𝑥
is defined as follows:

2
𝜋
∫
0
𝑥
𝑒
−
𝑡
2
d
𝑡
calc.erf(
float
) → float
value
float
Required
Positional
The number at which to calculate the error function.

fact
Calculates the factorial of a number.

calc.fact(
int
) → int
number
int
Required
Positional
The number whose factorial to calculate. Must be non-negative.

perm
Calculates a permutation.

Returns the
𝑘
-permutation of
𝑛
, or the number of ways to choose
𝑘
items from a set of
𝑛
with regard to order, defined as follows:

{
0
if
𝑘

> 𝑛
> 𝑛
> !
> (
> 𝑛
> −
> 𝑘
> )
> !
> if
> 𝑘
> ≤
> 𝑛
> calc.perm(
> int,
> int,
> ) → int
> base
> int
> Required
> Positional
> The value of
> 𝑛
> : The number of items to choose from. Must be non-negative.

numbers
int
Required
Positional
The value of
𝑘
: The number of items to choose. Must be non-negative.

binom
Calculates a binomial coefficient.

Returns the
𝑘
-combination of
𝑛
, or the number of ways to choose
𝑘
items from a set of
𝑛
without regard to order, defined as follows:

{
𝑛
!
𝑘
!
(
𝑛
−
𝑘
)
!
if
0
≤
𝑘
≤
𝑛
0
otherwise
calc.binom(
int,
int,
) → int
n
int
Required
Positional
The value of
𝑛
: The numbers of items to choose from. Must be non-negative.

k
int
Required
Positional
The value of
𝑘
: The number of items to choose. Must be non-negative.

gcd
Calculates the greatest common divisor of two integers.

This will error if the result of integer division would be larger than the maximum 64-bit signed integer.

calc.gcd(
int,
int,
) → int
a
int
Required
Positional
The first integer.

b
int
Required
Positional
The second integer.

lcm
Calculates the least common multiple of two integers.

calc.lcm(
int,
int,
) → int
a
int
Required
Positional
The first integer.

b
int
Required
Positional
The second integer.

floor
Rounds a number down to the nearest integer.

If the number is already an integer, it is returned unchanged.

Note that this function will always return an integer, and will error if the resulting float or decimal is larger than the maximum 64-bit signed integer or smaller than the minimum for that type.

calc.floor(
int
float
decimal
) → int
value
int or float or decimal
Required
Positional
The number to round down.

ceil
Rounds a number up to the nearest integer.

If the number is already an integer, it is returned unchanged.

Note that this function will always return an integer, and will error if the resulting float or decimal is larger than the maximum 64-bit signed integer or smaller than the minimum for that type.

calc.ceil(
int
float
decimal
) → int
value
int or float or decimal
Required
Positional
The number to round up.

trunc
Returns the integer part of a number.

If the number is already an integer, it is returned unchanged.

Note that this function will always return an integer, and will error if the resulting float or decimal is larger than the maximum 64-bit signed integer or smaller than the minimum for that type.

calc.trunc(
int
float
decimal
) → int
value
int or float or decimal
Required
Positional
The number to truncate.

fract
Returns the fractional part of a number.

If the number is an integer, returns 0.

calc.fract(
int
float
decimal
) → intfloatdecimal
value
int or float or decimal
Required
Positional
The number to truncate.

round
Rounds a number to the nearest integer.

Half-integers are rounded away from zero.

Optionally, a number of decimal places can be specified. If negative, its absolute value will indicate the amount of significant integer digits to remove before the decimal point.

Note that this function will return the same type as the operand. That is, applying round to a float will return a float, and to a decimal, another decimal. You may explicitly convert the output of this function to an integer with int, but note that such a conversion will error if the float or decimal is larger than the maximum 64-bit signed integer or smaller than the minimum integer.

In addition, this function can error if there is an attempt to round beyond the maximum or minimum integer or decimal. If the number is a float, such an attempt will cause float.inf or -float.inf to be returned for maximum and minimum respectively.

calc.round(
intfloatdecimal,
digits: int,
) → intfloatdecimal
value
int or float or decimal
Required
Positional
The number to round.

digits
int
Default: 0
If positive, the number of decimal places.

If negative, the number of significant integer digits that should be removed before the decimal point.

clamp
Clamps a number between a minimum and maximum value.

calc.clamp(
intfloatdecimal,
intfloatdecimal,
intfloatdecimal,
) → intfloatdecimal
value
int or float or decimal
Required
Positional
The number to clamp.

min
int or float or decimal
Required
Positional
The inclusive minimum value.

max
int or float or decimal
Required
Positional
The inclusive maximum value.

min
Determines the minimum of a sequence of values.

calc.min(..
any
) → any
values
any
Required
Positional
Variadic
The sequence of values from which to extract the minimum. Must not be empty.

max
Determines the maximum of a sequence of values.

calc.max(..
any
) → any
values
any
Required
Positional
Variadic
The sequence of values from which to extract the maximum. Must not be empty.

even
Determines whether an integer is even.

calc.even(
int
) → bool
value
int
Required
Positional
The number to check for evenness.

odd
Determines whether an integer is odd.

calc.odd(
int
) → bool
value
int
Required
Positional
The number to check for oddness.

rem
Calculates the remainder of two numbers.

The value calc.rem(x, y) always has the same sign as x, and is smaller in magnitude than y.

This can error if given a decimal input and the dividend is too small in magnitude compared to the divisor.

calc.rem(
intfloatdecimal,
intfloatdecimal,
) → intfloatdecimal
dividend
int or float or decimal
Required
Positional
The dividend of the remainder.

divisor
int or float or decimal
Required
Positional
The divisor of the remainder.

div-euclid
Performs euclidean division of two numbers.

The result of this computation is that of a division rounded to the integer n such that the dividend is greater than or equal to n times the divisor.

This can error if the resulting number is larger than the maximum value or smaller than the minimum value for its type.

calc.div-euclid(
intfloatdecimal,
intfloatdecimal,
) → intfloatdecimal
dividend
int or float or decimal
Required
Positional
The dividend of the division.

divisor
int or float or decimal
Required
Positional
The divisor of the division.

rem-euclid
This calculates the least nonnegative remainder of a division.

Warning: Due to a floating point round-off error, the remainder may equal the absolute value of the divisor if the dividend is much smaller in magnitude than the divisor and the dividend is negative. This only applies for floating point inputs.

In addition, this can error if given a decimal input and the dividend is too small in magnitude compared to the divisor.

calc.rem-euclid(
intfloatdecimal,
intfloatdecimal,
) → intfloatdecimal
dividend
int or float or decimal
Required
Positional
The dividend of the remainder.

divisor
int or float or decimal
Required
Positional
The divisor of the remainder.

quo
Calculates the quotient (floored division) of two numbers.

Note that this function will always return an integer, and will error if the resulting number is larger than the maximum 64-bit signed integer or smaller than the minimum for that type.

calc.quo(
intfloatdecimal,
intfloatdecimal,
) → int
dividend
int or float or decimal
Required
Positional
The dividend of the quotient.

divisor
int or float or decimal
Required
Positional
The divisor of the quotient.

norm
Calculates the
𝑝
-norm of a sequence of values.

The
𝑝
-norm of
𝑥
1
,
…
,
𝑥
𝑛
is defined as follows:

{
(
∑
𝑖
=
1
𝑛
|
𝑥
𝑖
|
𝑝
)
1
/
𝑝
if
0
<
𝑝
<

- ∞
  max
  𝑖
  =
  1
  𝑛
  |
  𝑥
  𝑖
  |
  if
  𝑝
  =
- ∞
  calc.norm(
  p: float,
  ..float,
  ) → float
  p
  float
  Default: 2.0
  The value of
  𝑝
  . Must be greater than zero.

The default value of 2.0 corresponds to the Euclidean norm:

∑
𝑖
=
1
𝑛
𝑥
𝑖
2
values
float
Required
Positional
Variadic
Variadic parameters can be specified multiple times.
The sequence of values to calculate the
𝑝
-norm of. Returns 0.0 if empty.
