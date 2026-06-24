par
Element
A logical subdivison of textual content.

Typst automatically collects inline-level elements into paragraphs. Inline-level elements include text, horizontal spacing, boxes, and inline equations.

To separate paragraphs, use a blank line (or an explicit parbreak). Paragraphs are also automatically interrupted by any block-level element (like block, place, or anything that shows itself as one of these).

The par element is primarily used in set rules to affect paragraph properties, but it can also be used to explicitly display its argument as a paragraph of its own. Then, the paragraph’s body may not contain any block-level content.

Boxes and blocks
As explained above, usually paragraphs only contain inline-level content. However, you can integrate any kind of block-level content into a paragraph by wrapping it in a box.

Conversely, you can separate inline-level content from a paragraph by wrapping it in a block. In this case, it will not become part of any paragraph at all. Read the following section for an explanation of why that matters and how it differs from just adding paragraph breaks around the content.

What becomes a paragraph?
When you add inline-level content to your document, Typst will automatically wrap it in paragraphs. However, a typical document also contains some text that is not semantically part of a paragraph, for example in a heading or caption.

The rules for when Typst wraps inline-level content in a paragraph are as follows:

All text at the root of a document is wrapped in paragraphs.

Text in a container (like a block) is only wrapped in a paragraph if the container holds any block-level content. If all of the contents are inline-level, no paragraph is created.

In the laid-out document, it’s not immediately visible whether text became part of a paragraph. However, it is still important for various reasons:

Certain paragraph styling like first-line-indent will only apply to proper paragraphs, not any text. Similarly, par show rules of course only trigger on paragraphs.

A proper distinction between paragraphs and other text helps people who rely on Assistive Technology (AT) (such as screen readers) navigate and understand the document properly.

PDF export will generate a P tag only for paragraphs.

HTML export will generate a <p> tag only for paragraphs.

When creating custom reusable components, you can and should take charge over whether Typst creates paragraphs. By wrapping text in a block instead of just adding paragraph breaks around it, you can force the absence of a paragraph. Conversely, by adding a parbreak after some content in a container, you can force it to become a paragraph even if it’s just one word. This is, for example, what non-tight lists do to force their items to become paragraphs.

Example
#set par(
first-line-indent: 1em,
spacing: 0.65em,
justify: true,
)

We proceed by contradiction.
Suppose that there exists a set
of positive integers $a$, $b$, and
$c$ that satisfies the equation
$a^n + b^n = c^n$ for some
integer value of $n > 2$.

Without loss of generality,
let $a$ be the smallest of the
three integers. Then, we ...

Parameters
par(
leading: length,
spacing: length,
justify: bool,
justification-limits: dictionary,
linebreaks: autostr,
first-line-indent: lengthdictionary,
hanging-indent: length,
content,
) → content
leading
length
Settable
Default: 0.65em
The spacing between lines.

Leading defines the spacing between the bottom edge of one line and the top edge of the following line. By default, these two properties are up to the font, but they can also be configured manually with a text set rule.

By setting top edge, bottom edge, and leading, you can also configure a consistent baseline-to-baseline distance. You could, for instance, set the leading to 1em, the top-edge to 0.8em, and the bottom-edge to -0.2em to get a baseline gap of exactly 2em. The exact distribution of the top- and bottom-edge values affects the bounds of the first and last line.

spacing
length
Settable
Default: 1.2em
The spacing between paragraphs.

Just like leading, this defines the spacing between the bottom edge of a paragraph’s last line and the top edge of the next paragraph’s first line. Spacing acts both above and below, collapsing to the greater of the amounts defined by adjacent paragraphs.

When a paragraph is adjacent to a block, that block’s above or below property takes precedence over the paragraph spacing. Headings, for instance, reduce the spacing below them by default for a better look.

justify
bool
Settable
Default: false
Whether to justify text in its line.

Hyphenation will be enabled for justified paragraphs if the text function’s hyphenate property is set to auto and the current language is known.

Note that the current alignment still has an effect on the placement of the last line except if it ends with a justified line break.

By default, Typst only changes the spacing between words to achieve justification. However, you can also allow it to adjust the spacing between individual characters using the justification-limits property.

justification-limits
dictionary
Settable
Default: (
spacing: (min: 66.67% + 0pt, max: 150% + 0pt),
tracking: (min: 0pt, max: 0pt),
)
How much the spacing between words and characters may be adjusted during justification.

When justifying text, Typst needs to stretch or shrink a line to the full width of the measure. To achieve this, by default, it adjusts the spacing between words. Additionally, it can also adjust the spacing between individual characters. This property allows you to configure lower and upper bounds for these adjustments.

The property accepts a dictionary with two entries, spacing and tracking, each containing a dictionary with the keys min and max. The min keys define down to which lower bound gaps may be shrunk while the max keys define up to which upper bound they may be stretched.

The spacing entry defines how much the width of spaces between words may be adjusted. It is closely related to text.spacing and its min and max keys accept relative lengths, just like the spacing property.

A min value of 100% means that spaces should retain their normal size (i.e. not be shrunk), while a value of 90% - 0.01em would indicate that a space can be shrunk to a width of 90% of its normal width minus 0.01× the current font size. Similarly, a max value of 100% + 0.02em means that a space’s width can be increased by 0.02× the current font size. The ratio part must always be positive. The length part, meanwhile, must not be positive for min and not be negative for max.

Note that spaces may still be expanded beyond the max value if there is no way to justify the line otherwise. However, other means of justification (e.g. spacing apart characters if the tracking entry is configured accordingly) are first used to their maximum.

The tracking entry defines how much the spacing between letters may be adjusted. It is closely related to text.tracking and its min and max keys accept lengths, just like the tracking property. Unlike spacing, it does not accept relative lengths because the base of the relative length would vary for each character, leading to an uneven visual appearance. The behavior compared to spacing is as if the base was 100%.

Otherwise, the min and max values work just like for spacing. A max value of 0.01em means that additional spacing amounting to 0.01× of the current font size may be inserted between every pair of characters. Note that this also includes the gaps between spaces and characters, so for spaces the values of tracking act in addition to the values for spacing.

If you only specify one of spacing or tracking, the other retains its previously set value (or the default if it was not previously set).

If you want to enable character-level justification, a good value for the min and max keys is around 0.01em to 0.02em (negated for min). Using the same value for both gives a good baseline, but tweaking the two values individually may produce more balanced results, as demonstrated in the example below. Be careful not to set the bounds too wide, as it quickly looks unnatural.

Using character-level justification is an impactful microtypographical technique that can improve the appearance of justified text, especially in narrow columns. Note though that character-level justification does not work with every font or language. For example, cursive fonts connect letters. Using character-level justification would lead to jagged connections.

linebreaks
auto or str
Settable
Default: auto
How to determine line breaks.

When this property is set to auto, its default value, optimized line breaks will be used for justified paragraphs. Enabling optimized line breaks for ragged paragraphs may also be worthwhile to improve the appearance of the text.

Variant Details
"simple" Determine the line breaks in a simple first-fit style.
"optimized"
Optimize the line breaks for the whole paragraph.

Typst will try to produce more evenly filled lines of text by considering the whole paragraph when calculating line breaks.

first-line-indent
length or dictionary
Settable
Default: (amount: 0pt, all: false)
The indent the first line of a paragraph should have.

By default, only the first line of a consecutive paragraph will be indented (not the first one in the document or container, and not paragraphs immediately following other block-level elements).

If you want to indent all paragraphs instead, you can pass a dictionary containing the amount of indent as a length and the pair all: true. When all is omitted from the dictionary, it defaults to false.

By typographic convention, paragraph breaks are indicated either by some space between paragraphs or by indented first lines. Consider

reducing the paragraph spacing to the leading using set par(spacing: 0.65em)
increasing the block spacing (which inherits the paragraph spacing by default) to the original paragraph spacing using set block(spacing: 1.2em)
hanging-indent
length
Settable
Default: 0pt
The indent that all but the first line of a paragraph should have.

body
content
Required
Positional
The contents of the paragraph.

Definitions
line
Element
A paragraph line.

This element is exclusively used for line number configuration through set rules and cannot be placed.

The numbering option is used to enable line numbers by specifying a numbering format.

The numbering option takes either a predefined numbering pattern or a function returning styled content. You can disable line numbers for text inside certain elements by setting the numbering to none using show-set rules.

This element exposes further options which may be used to control other aspects of line numbering, such as its alignment or margin. In addition, you can control whether the numbering is reset on each page through the numbering-scope option.

par.line(
numbering: nonestrfunction,
number-align: autoalignment,
number-margin: alignment,
number-clearance: autolength,
numbering-scope: str,
) → content
numbering
none or str or function
Settable
Default: none
How to number each line. Accepts a numbering pattern or function taking a single number.

number-align
auto or alignment
Settable
Default: auto
The alignment of line numbers associated with each line.

The default of auto indicates a smart default where numbers grow horizontally away from the text, considering the margin they’re in and the current text direction.

number-margin
alignment
Settable
Default: start
The margin at which line numbers appear.

Note: In a multi-column document, the line numbers for paragraphs inside the last column will always appear on the end margin (right margin for left-to-right text and left margin for right-to-left), regardless of this configuration. That behavior cannot be changed at this moment.

number-clearance
auto or length
Settable
Default: auto
The distance between line numbers and text.

The default value of auto results in a clearance that is adaptive to the page width and yields reasonable results in most cases.

numbering-scope
str
Settable
Default: "document"
Controls when to reset line numbering.

Note: The line numbering scope must be uniform across each page run (a page run is a sequence of pages without an explicit pagebreak in between). For this reason, set rules for it should be defined before any page content, typically at the very start of the document.

Variant Details
"document" Indicates that the line number counter spans the whole document, i.e., it’s never automatically reset.
"page" Indicates that the line number counter should be reset at the start of every new page.
