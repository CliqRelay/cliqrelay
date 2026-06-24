page
Element
Layouts its child onto one or multiple pages.

Although this function is primarily used in set rules to affect page properties, it can also be used to explicitly render its argument onto a set of pages of its own.

Pages can be set to use auto as their width or height. In this case, the pages will grow to fit their content on the respective axis.

The Guide for Page Setup explains how to use this and related functions to set up a document with many examples.

Example
#set page("us-letter")

There you go, US friends!

Accessibility
The contents of the page’s header, footer, foreground, and background are invisible to Assistive Technology (AT) like screen readers. Only the body of the page is read by AT. Do not include vital information not included elsewhere in the document in these areas.

Styling
Note that the page element cannot be targeted by show rules; writing show page: .. has no effect. To repeat content on every page, you can instead configure the header, footer, background, and foreground properties with a set rule.

Parameters
page(
paper: str,
width: autolength,
height: autolength,
flipped: bool,
margin: autorelativedictionary,
bleed: relativedictionary,
binding: autoalignment,
columns: int,
fill: noneautocolorgradienttiling,
numbering: nonestrfunction,
supplement: noneautocontent,
number-align: alignment,
header: noneautocontent,
header-ascent: relative,
footer: noneautocontent,
footer-descent: relative,
background: nonecontent,
foreground: nonecontent,
body: content,
) → content
paper
str
Default: "a4"
A standard paper size to set width and height.

This is just a shorthand for setting width and height and, as such, cannot be retrieved in a context expression.

width
auto or length
Settable
Default: 595.28pt
The width of the final page, after any trims have been applied.

In professional printing setups, this may be smaller than the sheet size fed into the printer.

See the bleed parameter for details on how to set a trim or bleed area.

height
auto or length
Settable
Default: 841.89pt
The height of the final page area, after any trims have been applied.

If this is set to auto, page breaks can only be triggered manually by inserting a page break or by adding another non-empty page set rule. Most examples throughout this documentation use auto for the height of the page to dynamically grow and shrink to fit their content.

flipped
bool
Settable
Default: false
Whether the page is flipped into landscape orientation.

margin
auto or relative or dictionary
Settable
Default: auto
The page’s margins.

auto: The margins are set automatically to 2.5/21 times the smaller dimension of the page. This results in 2.5 cm margins for an A4 page.
A single length: The same margin on all sides.
A dictionary: With a dictionary, the margins can be set individually. The dictionary can contain the following keys in order of precedence:

top: The top margin.
right: The right margin.
bottom: The bottom margin.
left: The left margin.
inside: The margin at the inner side of the page (where the binding is).
outside: The margin at the outer side of the page (opposite to the binding).
x: The horizontal margins.
y: The vertical margins.
rest: The margins on all sides except those for which the dictionary explicitly sets a size.
All keys are optional; omitted keys will use their previously set value, or the default margin if never set. In addition, the values for left and right are mutually exclusive with the values for inside and outside. The values should be relative lengths or auto.

bleed
relative or dictionary
Settable
Default: (:)
The page’s bleed margin.

The bleed is the area of content that extends beyond the final trimmed size of the page. It ensures that no unprinted edges appear in the final product, even if minor trimming misalignments occur.

Accepted values:

A single length: The same bleed on all sides.
A dictionary: With a dictionary, the bleed margins can be set individually. The dictionary may include the following keys, listed in order of precedence:

top: The top bleed margin.
right: The right bleed margin.
bottom: The bottom bleed margin.
left: The left bleed margin.
inside: The bleed margin at the inner side of the page (where the binding is).
outside: The bleed margin at the outer side of the page (opposite to the binding).
x: The horizontal bleed margins.
y: The vertical bleed margins.
rest: The bleed margins on all sides except those for which the dictionary explicitly sets a size.
All keys are optional; omitted keys will use their previously set value, or 0pt if never set. In addition, the values for left and right are mutually exclusive with the values for inside and outside. The values should be relative lengths.

In PDF export, if the bleed is non-zero, a TrimBox is defined for the page.

binding
auto or alignment
Settable
Default: auto
On which side the pages will be bound.

auto: Equivalent to left if the text direction is left-to-right and right if it is right-to-left.
left: Bound on the left side.
right: Bound on the right side.
This affects the meaning of the inside and outside options for margins.

columns
int
Settable
Default: 1
How many columns the page has.

If you need to insert columns into a page or other container, you can also use the columns function.

#set page(columns: 2, height: 4.8cm)
Climate change is one of the most
pressing issues of our time, with
the potential to devastate
communities, ecosystems, and
economies around the world. It's
clear that we need to take urgent
action to reduce our carbon
emissions and mitigate the impacts
of a rapidly changing climate.

fill
none or auto or color or gradient or tiling
Settable
Default: auto
The page’s background fill.

Setting this to something non-transparent instructs the printer to color the complete page. If you are considering larger production runs, it may be more environmentally friendly and cost-effective to source pre-dyed pages and not set this property.

When set to none, the background becomes transparent. Note that PDF pages will still appear with a (usually white) background in viewers, but they are actually transparent. (If you print them, no color is used for the background.)

The default of auto results in none for PDF output, and white for PNG and SVG.

numbering
none or str or function
Settable
Default: none
How to number the pages. You can refer to the Page Setup Guide for customizing page numbers.

Accepts a numbering pattern or function taking one or two numbers:

The first number is the current page number.
The second number is the total number of pages. In a numbering pattern, the second number can be omitted. If a function is passed, it will receive one argument in the context of links or references, and two arguments when producing the visible page numbers.
These are logical numbers controlled by the page counter, and may thus not match the physical numbers. Specifically, they are the current and the final value of counter(page). See the counter documentation for more details.

If an explicit footer (or header for top-aligned numbering) is given, the numbering is ignored.

supplement
none or auto or content
Settable
Default: auto
A supplement for the pages.

For page references, this is added before the page number.

number-align
alignment
Settable
Default: center + bottom
The alignment of the page numbering.

If the vertical component is top, the numbering is placed into the header and if it is bottom, it is placed in the footer. Horizon alignment is forbidden. If an explicit matching header or footer is given, the numbering is ignored.

header
none or auto or content
Settable
Default: auto
The page’s header. Fills the top margin of each page.

Content: Shows the content as the header.
auto: Shows the page number if a numbering is set and number-align is top.
none: Suppresses the header.
header-ascent
relative
Settable
Default: 30% + 0pt
The amount the header is raised into the top margin. Ratios are relative to the height of the top margin.

footer
none or auto or content
Settable
Default: auto
The page’s footer. Fills the bottom margin of each page.

Content: Shows the content as the footer.
auto: Shows the page number if a numbering is set and number-align is bottom.
none: Suppresses the footer.
For just a page number, the numbering property typically suffices. If you want to create a custom footer but still display the page number, you can directly access the page counter.

footer-descent
relative
Settable
Default: 30% + 0pt
The amount the footer is lowered into the bottom margin. Ratios are relative to the height of the bottom margin.

background
none or content
Settable
Default: none
Content in the page’s background.

This content will be placed behind the page’s body. It can be used to place a background image or a watermark.

For convenience, relative lengths are resolved against the page size including the page bleed when used in background content. For example, on a page that is 100mm wide with a 5mm bleed, a width of 100% is computed as 5mm + 100mm + 5mm.

foreground
none or content
Settable
Default: none
Content in the page’s foreground.

This content will overlay the page’s body.

Relative lengths are resolved against the page size including bleed, following the same behavior as background.

body
content
Default: []
The contents of the page(s).

Multiple pages will be created if the content does not fit on a single page. A new page with the page properties prior to the function invocation will be created after the body has been typeset.
