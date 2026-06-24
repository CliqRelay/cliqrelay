enum
Element
A numbered list.

Displays a sequence of items vertically and numbers them consecutively.

Example
Automatically numbered:

- Preparations
- Analysis
- Conclusions

Manually numbered: 2. What is the first step? 5. I am confused.

- Moving on ...

Multiple lines:

- This enum item has multiple
  lines because the next line
  is indented.

Function call.
#enum[First][Second]

You can easily switch all your enumerations to a different numbering style with a set rule.

#set enum(numbering: "a)")

- Starting off ...
- Don't forget step two

You can also use enum.item to programmatically customize the number of each item in the enumeration:

#enum(
enum.item(1)[First step],
enum.item(5)[Fifth step],
enum.item(10)[Tenth step]
)

Syntax
This functions also has dedicated syntax:

Starting a line with a plus sign creates an automatically numbered enumeration item.
Starting a line with a number followed by a dot creates an explicitly numbered enumeration item.
Enumeration items can contain multiple paragraphs and other block-level content. All content that is indented more than an item’s marker becomes part of that item.

Parameters
enum(
tight: bool,
numbering: strfunction,
start: autoint,
full: bool,
reversed: bool,
indent: length,
body-indent: length,
spacing: autolength,
number-align: alignment,
..contentarray,
) → content
tight
bool
Settable
Default: true
Defines the default spacing of the enumeration. If it is false, the items are spaced apart with paragraph spacing. If it is true, they use paragraph leading instead. This makes the list more compact, which can look better if the items are short.

In markup mode, the value of this parameter is determined based on whether items are separated with a blank line. If items directly follow each other, this is set to true; if items are separated by a blank line, this is set to false. The markup-defined tightness cannot be overridden with set rules.

numbering
str or function
Settable
Default: "1."
How to number the enumeration. Accepts a numbering pattern or function.

If the numbering pattern contains multiple counting symbols, they apply to nested enums. If given a function, the function receives one argument if full is false and multiple arguments if full is true.

start
auto or int
Settable
Default: auto
Which number to start the enumeration with.

full
bool
Settable
Default: false
Whether to display the full numbering, including the numbers of all parent enumerations.

reversed
bool
Settable
Default: false
Whether to reverse the numbering for this enumeration.

indent
length
Settable
Default: 0pt
The indentation of each item.

body-indent
length
Settable
Default: 0.5em
The space between the numbering and the body of each item.

spacing
auto or length
Settable
Default: auto
The spacing between the items of the enumeration.

If set to auto, uses paragraph leading for tight enumerations and paragraph spacing for wide (non-tight) enumerations.

number-align
alignment
Settable
Default: end
The alignment that enum numbers should have.

By default, this is set to end, which aligns enum numbers horizontally towards the end of the current text direction (in a left-to-right script, for example, this is the same as right). In addition, the lack of a vertical alignment places each number vertically just above the baseline of the item, as if it were part of its first line of text.

The choice of end for horizontal alignment of enum numbers is usually preferred over start, as numbers then grow away from the text instead of towards it. This option lets you override this behaviour, however.

As for vertical alignment, it can be overridden if baseline alignment is not desired. For example, an alignment of end + top would always place the marker vertically near the top of the item, whereas end +
bottom would move it near the bottom.

Also to note is that the unordered list possesses a similar option named marker-align instead, which also controls both axes of marker alignment in the exact same way as enum numbers.

children
content or array
Required
Positional
Variadic
The numbered list’s items.

When using the enum syntax, adjacent items are automatically collected into enumerations, even through constructs like for loops.

Definitions
item
Element
An enumeration item.

enum.item(
autoint,
content,
) → content
number
auto or int
Positional
Settable
Default: auto
The item’s number.

body
content
Required
Positional
The item’s body.
