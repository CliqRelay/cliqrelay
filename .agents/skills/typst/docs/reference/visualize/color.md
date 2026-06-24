color
A color in a specific color space.

Typst supports:

sRGB through the rgb function
Device CMYK through the cmyk function
D65 Gray through the luma function
Oklab through the oklab function
Oklch through the oklch function
Linear RGB through the color.linear-rgb function
HSL through the color.hsl function
HSV through the color.hsv function
Color spaces described by spot colorants through the color.spot type
All color spaces except for CMYK and spot colorants have alpha channels.

Throughout the documentation, we use the term process color for colors that can be blended with each other (currently all colors other than spot colors). In this term, process signifies that the shade is being created throughout the printing process instead of ahead of time.

Example
#rect(fill: aqua)

Predefined colors
Typst defines the following built-in colors:

Color Definition
black luma(0)
gray luma(170)
silver luma(221)
white luma(255)
navy rgb("#001f3f")
blue rgb("#0074d9")
aqua rgb("#7fdbff")
teal rgb("#39cccc")
eastern rgb("#239dad")
purple rgb("#b10dc9")
fuchsia rgb("#f012be")
maroon rgb("#85144b")
red rgb("#ff4136")
orange rgb("#ff851b")
yellow rgb("#ffdc00")
olive rgb("#3d9970")
green rgb("#2ecc40")
lime rgb("#01ff70")
The predefined colors and the most important color constructors are available globally and also in the color type’s scope, so you can write either color.red or just red.

Predefined color maps
Typst also includes a number of preset color maps that can be used for gradients. These are simply arrays of colors defined in the module color.map.

#circle(fill: gradient.linear(..color.map.crest))

Map Details
turbo A perceptually uniform rainbow-like color map. Read this blog post for more details.
cividis A blue to gray to yellow color map. See this blog post for more details.
rainbow Cycles through the full color spectrum. This color map is best used by setting the interpolation color space to HSL. The rainbow gradient is not suitable for data visualization because it is not perceptually uniform, so the differences between values become unclear to your readers. It should only be used for decorative purposes.
spectral Red to yellow to blue color map.
viridis A purple to teal to yellow color map.
inferno A black to red to yellow color map.
magma A black to purple to yellow color map.
plasma A purple to pink to yellow color map.
rocket A black to red to white color map.
mako A black to teal to white color map.
coolwarm A blue to white to red color map with smooth transitions.
vlag A light blue to white to red color map.
icefire A light teal to black to orange color map.
flare A orange to purple color map that is perceptually uniform.
crest A light green to blue color map.
Some popular presets are not included because they are not available under a free licence. Others, like Jet, are not included because they are not color blind friendly. Feel free to use or create a package with other presets that are useful to you!

Definitions
luma
Create a grayscale color.

A grayscale color is represented internally by a single lightness component.

These components are also available using the components method.

color.luma(
intratio,
ratio,
color,
) → color
lightness
int or ratio
Required
Positional
The lightness component.

alpha
ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to grayscale.

If this is given, the lightness should not be given.

oklab
Create an Oklab color.

This color space is well suited for the following use cases:

Color manipulation such as saturating while keeping perceived hue
Creating grayscale images with uniform perceived lightness
Creating smooth and uniform color transition and gradients
A linear Oklab color is represented internally by an array of four components:

lightness (ratio)
a (float or ratio. Ratios are relative to 0.4; meaning 50% is equal to 0.2)
b (float or ratio. Ratios are relative to 0.4; meaning 50% is equal to 0.2)
alpha (ratio)
These components are also available using the components method.

color.oklab(
ratio,
floatratio,
floatratio,
ratio,
color,
) → color
lightness
ratio
Required
Positional
The lightness component.

a
float or ratio
Required
Positional
The a (“green/red”) component.

b
float or ratio
Required
Positional
The b (“blue/yellow”) component.

alpha
ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to Oklab.

If this is given, the individual components should not be given.

oklch
Create an Oklch color.

This color space is well suited for the following use cases:

Color manipulation involving lightness, chroma, and hue
Creating grayscale images with uniform perceived lightness
Creating smooth and uniform color transition and gradients
A linear Oklch color is represented internally by an array of four components:

lightness (ratio)
chroma (float or ratio. Ratios are relative to 0.4; meaning 50% is equal to 0.2)
hue (angle)
alpha (ratio)
These components are also available using the components method.

color.oklch(
ratio,
floatratio,
angle,
ratio,
color,
) → color
lightness
ratio
Required
Positional
The lightness component.

chroma
float or ratio
Required
Positional
The chroma component.

hue
angle
Required
Positional
The hue component.

alpha
ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to Oklch.

If this is given, the individual components should not be given.

linear-rgb
Create an RGB(A) color with linear luma.

This color space is similar to sRGB, but with the distinction that the color component are not gamma corrected. This makes it easier to perform color operations such as blending and interpolation. Although, you should prefer to use the oklab function for these.

A linear RGB(A) color is represented internally by an array of four components:

red (ratio)
green (ratio)
blue (ratio)
alpha (ratio)
These components are also available using the components method.

color.linear-rgb(
intratio,
intratio,
intratio,
intratio,
color,
) → color
red
int or ratio
Required
Positional
The red component.

green
int or ratio
Required
Positional
The green component.

blue
int or ratio
Required
Positional
The blue component.

alpha
int or ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to linear RGB(A).

If this is given, the individual components should not be given.

rgb
Create an RGB(A) color.

The color is specified in the sRGB color space.

An RGB(A) color is represented internally by an array of four components:

red (ratio)
green (ratio)
blue (ratio)
alpha (ratio)
These components are also available using the components method.

color.rgb(
intratio,
intratio,
intratio,
intratio,
str,
color,
) → color
red
int or ratio
Required
Positional
The red component.

green
int or ratio
Required
Positional
The green component.

blue
int or ratio
Required
Positional
The blue component.

alpha
int or ratio
Required
Positional
The alpha component.

hex
str
Required
Positional
Alternatively: The color in hexadecimal notation.

Accepts three, four, six or eight hexadecimal digits and optionally a leading hash.

If this is given, the individual components should not be given.

color
color
Required
Positional
Alternatively: The color to convert to RGB(a).

If this is given, the individual components should not be given.

cmyk
Create a CMYK color.

This is useful if you want to target a specific printer. The conversion to RGB for display preview might differ from how your printer reproduces the color.

A CMYK color is represented internally by an array of four components:

cyan (ratio)
magenta (ratio)
yellow (ratio)
key (ratio)
These components are also available using the components method.

Note that CMYK colors are not currently supported when PDF/A output is enabled.

color.cmyk(
ratio,
ratio,
ratio,
ratio,
color,
) → color
cyan
ratio
Required
Positional
The cyan component.

magenta
ratio
Required
Positional
The magenta component.

yellow
ratio
Required
Positional
The yellow component.

key
ratio
Required
Positional
The key component.

color
color
Required
Positional
Alternatively: The color to convert to CMYK.

If this is given, the individual components should not be given.

hsl
Create an HSL color.

This color space is useful for specifying colors by hue, saturation and lightness. It is also useful for color manipulation, such as saturating while keeping perceived hue.

An HSL color is represented internally by an array of four components:

hue (angle)
saturation (ratio)
lightness (ratio)
alpha (ratio)
These components are also available using the components method.

color.hsl(
angle,
intratio,
intratio,
intratio,
color,
) → color
hue
angle
Required
Positional
The hue angle.

saturation
int or ratio
Required
Positional
The saturation component.

lightness
int or ratio
Required
Positional
The lightness component.

alpha
int or ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to HSL.

If this is given, the individual components should not be given.

hsv
Create an HSV color.

This color space is useful for specifying colors by hue, saturation and value. It is also useful for color manipulation, such as saturating while keeping perceived hue.

An HSV color is represented internally by an array of four components:

hue (angle)
saturation (ratio)
value (ratio)
alpha (ratio)
These components are also available using the components method.

color.hsv(
angle,
intratio,
intratio,
intratio,
color,
) → color
hue
angle
Required
Positional
The hue angle.

saturation
int or ratio
Required
Positional
The saturation component.

value
int or ratio
Required
Positional
The value component.

alpha
int or ratio
Required
Positional
The alpha component.

color
color
Required
Positional
Alternatively: The color to convert to HSL.

If this is given, the individual components should not be given.

components
Extracts the components of this color.

The size and values of this array depends on the color space. You can obtain the color space using space. Below is a table of the color spaces and their components:

Color space C1 C2 C3 C4
luma Lightness
oklab Lightness a b Alpha
oklch Lightness Chroma Hue Alpha
linear-rgb Red Green Blue Alpha
rgb Red Green Blue Alpha
cmyk Cyan Magenta Yellow Key
hsl Hue Saturation Lightness Alpha
hsv Hue Saturation Value Alpha
spot Tint
For the meaning and type of each individual value, see the documentation of the corresponding color space. The alpha component is optional and only included if the alpha argument is true. The length of the returned array depends on the number of components and whether the alpha component is included.

self.components(
alpha
:
bool
) → array
alpha
bool
Default: true
Whether to include the alpha component.

space
Returns the constructor function for this color’s space.

Returns one of:

luma
oklab
oklch
linear-rgb
rgb
cmyk
hsl
hsv
self.space() → spotany
to-hex
Returns the color’s RGB(A) hex representation (such as #ffaa32 or #020304fe). The alpha component (last two digits in #020304fe) is omitted if it is equal to ff (255 / 100%).

self.to-hex() → str
lighten
Lightens a color by a given factor.

self.lighten(
ratio
) → color
factor
ratio
Required
Positional
The factor to lighten the color by.

darken
Darkens a color by a given factor.

self.darken(
ratio
) → color
factor
ratio
Required
Positional
The factor to darken the color by.

saturate
Increases the saturation of a color by a given factor.

Only process colors can be saturated. If you want to saturate a spot color, convert it into a process color first.

self.saturate(
ratio
) → color
factor
ratio
Required
Positional
The factor to saturate the color by.

desaturate
Decreases the saturation of a color by a given factor.

Only process colors can be desaturated. If you want to desaturate a spot color, convert it into a process color first.

self.desaturate(
ratio
) → color
factor
ratio
Required
Positional
The factor to desaturate the color by.

negate
Produces the complementary color using a provided color space. You can think of it as the opposite side on a color wheel.

self.negate(
space
:
auto
spot
any
) → color
space
auto or spot or any
Default: auto
The color space used for the transformation. By default, a perceptual color space is used.

rotate
Rotates the hue of the color by a given angle.

This function only works on color models with a well-defined hue component, i.e. Oklch, HSL, and HSV.

self.rotate(
angle,
space: any,
) → color
angle
angle
Required
Positional
The angle to rotate the hue by.

space
any
Default: oklch
The color space used to rotate. By default, this happens in a perceptual color space (oklch).

mix
Create a color by mixing two or more colors.

In color spaces with a hue component (HSL, HSV, Oklch), only two colors can be mixed at once. Mixing more than two colors in such a space will result in an error!

color.mix(
..colorarray,
space: autospotany,
) → color
colors
color or array
Required
Positional
Variadic
The colors, optionally with weights, specified as a pair (array of length two) of color and weight (float or ratio).

The weights do not need to add to 100%, they are relative to the sum of all weights.

space
auto or spot or any
Default: auto
The color space to mix in. By default, this happens in a perceptual color space (oklab) or, if all colors use the same spot colorant, using that colorant.

All colors will be converted into this color space.

transparentize
Makes a color more transparent by a given factor.

This method is relative to the existing alpha value. If the scale is positive, calculates alpha - alpha \* scale. Negative scales behave like color.opacify(-scale).

self.transparentize(
ratio
) → color
scale
ratio
Required
Positional
The factor to change the alpha value by.

opacify
Makes a color more opaque by a given scale.

This method is relative to the existing alpha value. If the scale is positive, calculates alpha + scale - alpha \* scale. Negative scales behave like color.transparentize(-scale).

self.opacify(
ratio
) → color
scale
ratio
Required
Positional
The scale to change the alpha value by.

spot
A spot colorant from which spot colors can be created.

Use spot colors to request a precise pigment in a professional print environment. Once you have created a spot colorant, you can create colors using its tint method.

Constructor
Create a new spot colorant.

color.spot(
nonestr,
color,
) → spot
name
none or str
Required
Positional
Name of the spot colorant to use.

In production, this name will be manually checked and matched to a colorant, so this value needs to be unambiguous. It’s best to reference a color from a registry like PANTONE, HKS, RAL, Toyo & DIC, etc.

Values in here may be treated case-sensitively during production: "PANTONE 2221 C" and "PANTONE 2221 c" may be treated as separate colors. Ensure that you are using a consistent naming convention, either referencing a registry or through coordination with your production printing experts.

If this value is "all" and your print will involve multiple color plates, use of this colorant will result in the specified tint being applied equally to all plates. If you choose none, no colorant will be applied when using this color. Instead, you can use a spot color with the name none to indicate cuts or varnishes. Be sure to discuss this with your production printer!

We do not recommend using the names "Cyan", "Magenta", "Yellow", "Key", "Black", or their translations to your local language. Depending on your printer, they may or may not be interpreted as CMYK process colors.

Variant Details
"all" Use all available color plates instead of only a specific colorant.
fallback
color
Required
Positional
How to render this color if the specified colorant is not available.

Many mediums, like on-screen preview and household printers, will not have this specific spot colorant available. To display an approximation of the intended print, another, available color is used instead.

Definitions on spot
tint
Create a spot color at a specific tint of this colorant.

The tint represents what percentage of the colorant is applied. A tint of 100% means the colorant is applied at full strength, while 0% means no colorant is applied.

self.tint(
ratio
) → color
value
ratio
Required
Positional
The tint percentage, between 0% and 100%.
